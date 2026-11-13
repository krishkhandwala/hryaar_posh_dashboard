import base64
import hashlib
import hmac
import io
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.deps import get_current_user, get_tenant_company_id
from app.core.permissions import user_has_permission
from app.db.session import get_db
from app.services.event_bus import publish_realtime_event
from app.models.models import (
    AuditLog,
    Company,
    PaymentTransaction,
    Subscription,
    SubscriptionPlan,
    User,
)

router = APIRouter()

INR_PER_USD = 84
SEAT_PACK_PRICE_USD_CENTS = 200  # $2.00 per wholesale/extra seat pack unit


def _require_billing_access(current_user: User, db: Session):
    allowed = (
        current_user.role in ["SUPER_ADMIN", "PLATFORM_ADMIN"]
        or user_has_permission(current_user, "partner.billing.manage", db)
        or user_has_permission(current_user, "company.billing.manage", db)
        or current_user.role in ["PARTNER_ADMIN", "COMPANY_ADMIN", "HR_ADMIN"]
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Billing privileges required",
        )


def _compute_sandbox_signature(order_id: str, payment_id: str) -> str:
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    secret = settings.SECRET_KEY.encode("utf-8")
    return hmac.new(secret, msg, hashlib.sha256).hexdigest()


def _fulfill_transaction(tx: PaymentTransaction, payment_id: str, db: Session, actor_email: str):
    """Idempotently activates plan / adds purchased seats and marks invoice PAID."""
    if tx.status == "PAID":
        return

    tx.status = "PAID"
    tx.payment_id = payment_id
    tx.signature_verified = True
    tx.paid_at = datetime.utcnow()
    if not tx.invoice_number:
        tx.invoice_number = f"INV-POSH-{datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

    comp = db.query(Company).filter(Company.id == tx.company_id).first()
    if comp:
        comp.subscription_status = "ACTIVE"
        if tx.plan_id:
            comp.subscription_plan_id = tx.plan_id
        if tx.seats_purchased and tx.seats_purchased > 0:
            comp.assigned_seat_quota = (comp.assigned_seat_quota or 0) + tx.seats_purchased

        sub = db.query(Subscription).filter(Subscription.company_id == comp.id).first()
        duration_days = 365 if tx.billing_cycle == "ANNUAL" else 30
        if sub:
            sub.status = "ACTIVE"
            if tx.plan_id:
                sub.plan_id = tx.plan_id
            base_dt = sub.expiry_date if (sub.expiry_date and sub.expiry_date > datetime.utcnow()) else datetime.utcnow()
            sub.expiry_date = base_dt + timedelta(days=duration_days)
        elif tx.plan_id:
            db.add(
                Subscription(
                    company_id=comp.id,
                    plan_id=tx.plan_id,
                    status="ACTIVE",
                    start_date=datetime.utcnow(),
                    expiry_date=datetime.utcnow() + timedelta(days=duration_days),
                )
            )

    db.add(
        AuditLog(
            company_id=tx.company_id,
            user_email=actor_email,
            action="PAYMENT_SUCCEEDED",
            entity_type="PaymentTransaction",
            entity_id=tx.id,
            details=f"Invoice {tx.invoice_number} paid via {tx.provider}: {tx.currency} {tx.amount_cents / 100:.2f}",
        )
    )
    db.commit()
    db.refresh(tx)

    publish_realtime_event(
        db=db,
        event_type="INVOICE_PAID",
        title="Payment & Invoice Verified",
        message=f"Invoice {tx.invoice_number} paid ({tx.currency} {tx.amount_cents / 100:.2f}). {tx.seats_purchased or 0} seats provisioned.",
        company_id=tx.company_id,
        payload={
            "invoice_number": tx.invoice_number,
            "order_id": tx.order_id,
            "amount": tx.amount_cents / 100,
            "seats_purchased": tx.seats_purchased
        }
    )


@router.get("/plans")
def list_billing_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plans = db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True).order_by(SubscriptionPlan.price_monthly.asc()).all()
    razorpay_enabled = bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)
    stripe_enabled = bool(settings.STRIPE_SECRET_KEY)

    return {
        "gateways": {
            "razorpay_enabled": razorpay_enabled,
            "razorpay_key_id": settings.RAZORPAY_KEY_ID if razorpay_enabled else None,
            "stripe_enabled": stripe_enabled,
            "sandbox_enabled": True,
            "default_currency": settings.PAYMENT_CURRENCY,
        },
        "seat_pack_price_usd": SEAT_PACK_PRICE_USD_CENTS / 100,
        "seat_pack_price_inr": round((SEAT_PACK_PRICE_USD_CENTS / 100) * INR_PER_USD),
        "plans": [
            {
                "id": p.id,
                "name": p.name,
                "display_name": p.display_name,
                "price_monthly_usd": p.price_monthly,
                "price_monthly_inr": round(p.price_monthly * INR_PER_USD),
                "max_employees": p.max_employees,
                "storage_limit_mb": p.storage_limit_mb,
                "features": json.loads(p.features) if p.features and p.features.startswith("[") else [],
            }
            for p in plans
        ],
    }


@router.get("/summary")
def get_billing_summary(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_billing_access(current_user, db)
    is_sa = current_user.role in ["SUPER_ADMIN", "PLATFORM_ADMIN"]

    if is_sa and not company_id:
        txs = (
            db.query(PaymentTransaction)
            .order_by(PaymentTransaction.created_at.desc())
            .limit(50)
            .all()
        )
        paid_inr = (
            db.query(func.coalesce(func.sum(PaymentTransaction.amount_cents), 0))
            .filter(PaymentTransaction.status == "PAID", PaymentTransaction.currency == "INR")
            .scalar()
            or 0
        )
        paid_usd = (
            db.query(func.coalesce(func.sum(PaymentTransaction.amount_cents), 0))
            .filter(PaymentTransaction.status == "PAID", PaymentTransaction.currency == "USD")
            .scalar()
            or 0
        )
        return {
            "scope": "PLATFORM",
            "total_collected_inr": round(paid_inr / 100, 2),
            "total_collected_usd": round(paid_usd / 100, 2),
            "paid_invoices_count": db.query(PaymentTransaction).filter(PaymentTransaction.status == "PAID").count(),
            "transactions": [
                {
                    "id": t.id,
                    "company_id": t.company_id,
                    "company_name": t.company.name if t.company else t.company_id,
                    "provider": t.provider,
                    "order_id": t.order_id,
                    "payment_id": t.payment_id,
                    "amount": round(t.amount_cents / 100, 2),
                    "currency": t.currency,
                    "billing_cycle": t.billing_cycle,
                    "seats_purchased": t.seats_purchased,
                    "status": t.status,
                    "invoice_number": t.invoice_number,
                    "description": t.description,
                    "paid_at": t.paid_at,
                    "created_at": t.created_at,
                }
                for t in txs
            ],
        }

    tenant_id = get_tenant_company_id(company_id, current_user, db)
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Organisation not found")

    txs = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.company_id == tenant_id)
        .order_by(PaymentTransaction.created_at.desc())
        .limit(30)
        .all()
    )
    sub = db.query(Subscription).filter(Subscription.company_id == tenant_id).first()

    return {
        "scope": "ORGANISATION",
        "company_id": comp.id,
        "company_name": comp.name,
        "current_plan": comp.plan.display_name if comp.plan else "Enterprise",
        "subscription_status": comp.subscription_status or "ACTIVE",
        "assigned_seat_quota": comp.assigned_seat_quota or 0,
        "renewal_date": sub.expiry_date if sub else None,
        "transactions": [
            {
                "id": t.id,
                "provider": t.provider,
                "order_id": t.order_id,
                "payment_id": t.payment_id,
                "amount": round(t.amount_cents / 100, 2),
                "currency": t.currency,
                "billing_cycle": t.billing_cycle,
                "seats_purchased": t.seats_purchased,
                "status": t.status,
                "invoice_number": t.invoice_number,
                "description": t.description,
                "paid_at": t.paid_at,
                "created_at": t.created_at,
            }
            for t in txs
        ],
    }


@router.post("/checkout")
def create_payment_checkout(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates a Razorpay Order, Stripe Checkout Session, or HMAC-signed Sandbox order.
    Authoritative pricing is calculated server-side from SubscriptionPlan / seat packs.
    """
    _require_billing_access(current_user, db)
    tenant_id = get_tenant_company_id(payload.get("company_id"), current_user, db)
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Organisation not found")

    provider = str(payload.get("provider") or "SANDBOX").upper()
    if provider not in ["RAZORPAY", "STRIPE", "SANDBOX"]:
        raise HTTPException(status_code=400, detail="Unsupported payment provider")

    currency = str(payload.get("currency") or ("INR" if provider == "RAZORPAY" else "USD")).upper()
    if currency not in ["INR", "USD"]:
        currency = "INR"

    billing_cycle = str(payload.get("billing_cycle") or "MONTHLY").upper()
    if billing_cycle not in ["MONTHLY", "ANNUAL", "TOPUP"]:
        billing_cycle = "MONTHLY"

    plan_id = payload.get("plan_id")
    seats_to_add = int(payload.get("seats_to_add") or 0)
    if seats_to_add < 0 or seats_to_add > 100000:
        raise HTTPException(status_code=400, detail="Invalid seat quantity")

    plan = None
    amount_usd_cents = 0
    desc_parts = []

    if plan_id:
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Selected subscription plan not found")
        monthly_cents = int(round((plan.price_monthly or 0.0) * 100))
        if billing_cycle == "ANNUAL":
            amount_usd_cents += monthly_cents * 10  # 2 months free annually
        else:
            amount_usd_cents += monthly_cents
        desc_parts.append(f"{plan.display_name} ({billing_cycle})")

    if seats_to_add > 0:
        amount_usd_cents += seats_to_add * SEAT_PACK_PRICE_USD_CENTS
        desc_parts.append(f"+{seats_to_add:,} Seat Licences")

    if amount_usd_cents <= 0:
        raise HTTPException(status_code=400, detail="Select a paid plan or positive seat pack to checkout")

    amount_cents = amount_usd_cents * INR_PER_USD if currency == "INR" else amount_usd_cents
    description = " • ".join(desc_parts) or "HRYAAR Subscription"
    order_id = f"order_posh_{uuid.uuid4().hex[:14]}"
    checkout_url = None
    gateway_mode = "SANDBOX"
    key_id = None

    if provider == "RAZORPAY" and settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        auth_token = base64.b64encode(
            f"{settings.RAZORPAY_KEY_ID}:{settings.RAZORPAY_KEY_SECRET}".encode("utf-8")
        ).decode("ascii")
        resp = httpx.post(
            "https://api.razorpay.com/v1/orders",
            headers={"Authorization": f"Basic {auth_token}", "Content-Type": "application/json"},
            json={
                "amount": amount_cents,
                "currency": currency,
                "receipt": order_id,
                "notes": {"company_id": comp.id, "seats": str(seats_to_add)},
            },
            timeout=10.0,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Razorpay order creation failed: {resp.text}")
        rzp_data = resp.json()
        order_id = rzp_data["id"]
        gateway_mode = "LIVE"
        key_id = settings.RAZORPAY_KEY_ID

    elif provider == "STRIPE" and settings.STRIPE_SECRET_KEY:
        resp = httpx.post(
            "https://api.stripe.com/v1/checkout/sessions",
            headers={"Authorization": f"Bearer {settings.STRIPE_SECRET_KEY}"},
            data={
                "mode": "payment",
                "success_url": str(payload.get("success_url") or "http://localhost:3001/?payment=success"),
                "cancel_url": str(payload.get("cancel_url") or "http://localhost:3001/?payment=cancelled"),
                "line_items[0][price_data][currency]": currency.lower(),
                "line_items[0][price_data][product_data][name]": description,
                "line_items[0][price_data][unit_amount]": str(amount_cents),
                "line_items[0][quantity]": "1",
                "metadata[company_id]": comp.id,
            },
            timeout=10.0,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Stripe checkout failed: {resp.text}")
        stripe_data = resp.json()
        order_id = stripe_data["id"]
        checkout_url = stripe_data.get("url")
        gateway_mode = "LIVE"

    tx = PaymentTransaction(
        company_id=comp.id,
        plan_id=plan.id if plan else None,
        provider=provider if gateway_mode == "LIVE" else "SANDBOX",
        order_id=order_id,
        amount_cents=amount_cents,
        currency=currency,
        billing_cycle=billing_cycle,
        seats_purchased=seats_to_add,
        status="CREATED",
        description=description,
        created_by_user_id=current_user.id,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    publish_realtime_event(
        db=db,
        event_type="INVOICE_PAID",
        title="Payment & Invoice Verified",
        message=f"Invoice {tx.invoice_number} paid ({tx.currency} {tx.amount_cents / 100:.2f}). {tx.seats_purchased or 0} seats provisioned.",
        company_id=tx.company_id,
        payload={
            "invoice_number": tx.invoice_number,
            "order_id": tx.order_id,
            "amount": tx.amount_cents / 100,
            "seats_purchased": tx.seats_purchased
        }
    )

    sandbox_payment_id = f"pay_sandbox_{uuid.uuid4().hex[:12]}" if gateway_mode == "SANDBOX" else None
    sandbox_signature = _compute_sandbox_signature(order_id, sandbox_payment_id) if sandbox_payment_id else None

    return {
        "transaction_id": tx.id,
        "provider": tx.provider,
        "gateway_mode": gateway_mode,
        "order_id": order_id,
        "amount_cents": amount_cents,
        "amount": round(amount_cents / 100, 2),
        "currency": currency,
        "key_id": key_id,
        "checkout_url": checkout_url,
        "description": description,
        "sandbox_payment_id": sandbox_payment_id,
        "sandbox_signature": sandbox_signature,
    }


@router.post("/verify")
def verify_payment(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_billing_access(current_user, db)
    order_id = (payload.get("order_id") or "").strip()
    payment_id = (payload.get("payment_id") or "").strip()
    signature = (payload.get("signature") or "").strip()

    if not order_id or not payment_id or not signature:
        raise HTTPException(status_code=400, detail="order_id, payment_id, and signature are required")

    tx = db.query(PaymentTransaction).filter(PaymentTransaction.order_id == order_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Payment order not found")

    # Enforce strict tenant ownership unless SUPER_ADMIN
    if current_user.role not in ["SUPER_ADMIN", "PLATFORM_ADMIN"] and tx.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Forbidden: cannot verify payment for another organisation")

    if tx.provider == "RAZORPAY" and settings.RAZORPAY_KEY_SECRET:
        expected = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
            f"{order_id}|{payment_id}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
    else:
        expected = _compute_sandbox_signature(order_id, payment_id)

    if not hmac.compare_digest(expected, signature):
        tx.status = "FAILED"
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid payment cryptographic signature")

    _fulfill_transaction(tx, payment_id, db, current_user.email)
    return {
        "status": "PAID",
        "transaction_id": tx.id,
        "invoice_number": tx.invoice_number,
        "order_id": tx.order_id,
        "payment_id": tx.payment_id,
        "seats_purchased": tx.seats_purchased,
    }


@router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Razorpay webhook secret not configured")
    raw_body = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    expected = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=400, detail="Invalid Razorpay webhook signature")

    event = json.loads(raw_body.decode("utf-8"))
    if event.get("event") in ["payment.captured", "order.paid"]:
        entity = event.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = entity.get("order_id")
        payment_id = entity.get("id")
        tx = db.query(PaymentTransaction).filter(PaymentTransaction.order_id == order_id).first()
        if tx and payment_id:
            _fulfill_transaction(tx, payment_id, db, "razorpay-webhook@system")
    return {"status": "ok"}


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Stripe webhook secret not configured")
    raw_body = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")
    parts = dict(item.split("=", 1) for item in sig_header.split(",") if "=" in item)
    ts = parts.get("t", "")
    v1 = parts.get("v1", "")
    signed_payload = f"{ts}.{raw_body.decode('utf-8')}".encode("utf-8")
    expected = hmac.new(settings.STRIPE_WEBHOOK_SECRET.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    if not ts or not hmac.compare_digest(expected, v1):
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature")

    event = json.loads(raw_body.decode("utf-8"))
    if event.get("type") == "checkout.session.completed":
        obj = event.get("data", {}).get("object", {})
        order_id = obj.get("id")
        payment_id = obj.get("payment_intent") or obj.get("id")
        tx = db.query(PaymentTransaction).filter(PaymentTransaction.order_id == order_id).first()
        if tx and payment_id:
            _fulfill_transaction(tx, payment_id, db, "stripe-webhook@system")
    return {"status": "ok"}


@router.get("/invoices/{transaction_id}/pdf")
def download_invoice_pdf(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_billing_access(current_user, db)
    tx = db.query(PaymentTransaction).filter(PaymentTransaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if current_user.role not in ["SUPER_ADMIN", "PLATFORM_ADMIN"] and tx.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Forbidden: cross-tenant invoice access denied")

    comp = db.query(Company).filter(Company.id == tx.company_id).first()
    buf = io.BytesIO()
    pdf = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(50, height - 60, "HRYAAR SaaS Tax Invoice & Payment Receipt")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(50, height - 80, f"Invoice Number: {tx.invoice_number or tx.order_id}")
    pdf.drawString(50, height - 96, f"Date Issued: {(tx.paid_at or tx.created_at).strftime('%Y-%m-%d %H:%M UTC')}")
    pdf.drawString(50, height - 112, f"Billed Organisation: {comp.name if comp else tx.company_id}")
    pdf.drawString(50, height - 128, f"Payment Gateway: {tx.provider} | Order ID: {tx.order_id}")
    pdf.drawString(50, height - 144, f"Payment Reference: {tx.payment_id or 'Pending'} | Status: {tx.status}")

    pdf.line(50, height - 165, width - 50, height - 165)
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(50, height - 190, "Description")
    pdf.drawString(420, height - 190, "Amount")
    pdf.setFont("Helvetica", 11)
    pdf.drawString(50, height - 215, tx.description or "Subscription & Licence Allocation")
    pdf.drawString(420, height - 215, f"{tx.currency} {tx.amount_cents / 100:,.2f}")
    pdf.line(50, height - 235, width - 50, height - 235)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(320, height - 260, f"Total Paid: {tx.currency} {tx.amount_cents / 100:,.2f}")

    pdf.showPage()
    pdf.save()
    buf.seek(0)
    filename = f"{tx.invoice_number or tx.order_id}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

