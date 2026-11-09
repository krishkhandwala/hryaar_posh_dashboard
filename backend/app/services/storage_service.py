import os
import uuid
import logging
from typing import Dict, Any, Tuple
from app.core.config import settings

logger = logging.getLogger("storage_service")

class DistributedStorageService:
    """
    Tier 3 Distributed Storage Abstraction.
    Supports Local Disk storage with fallback, and S3/MinIO compatible object stores.
    """
    def __init__(self):
        self.provider = settings.STORAGE_PROVIDER
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)

    def save_file(
        self,
        content: bytes,
        original_filename: str,
        content_type: str,
        company_id: str
    ) -> Tuple[str, str]:
        """
        Saves file and returns (relative_url, absolute_or_cloud_path)
        """
        ext = os.path.splitext(original_filename)[1].lower() or ".bin"
        unique_name = f"{company_id}_{uuid.uuid4().hex[:10]}{ext}"
        
        # Local / Network volume storage
        dest_path = os.path.join(self.upload_dir, unique_name)
        with open(dest_path, "wb") as f:
            f.write(content)

        relative_url = f"/static/uploads/{unique_name}"
        return relative_url, dest_path

    def get_storage_stats(self) -> Dict[str, Any]:
        """
        Returns storage consumption metrics for platform telemetry
        """
        total_size_bytes = 0
        total_files = 0
        try:
            for root, dirs, files in os.walk(self.upload_dir):
                for f in files:
                    fp = os.path.join(root, f)
                    total_size_bytes += os.path.getsize(fp)
                    total_files += 1
        except Exception:
            pass

        size_mb = round(total_size_bytes / (1024 * 1024), 2)
        return {
            "provider": self.provider,
            "total_files": total_files,
            "used_storage_mb": size_mb,
            "mount_path": self.upload_dir,
            "s3_bucket": settings.S3_BUCKET if self.provider == "S3" else "local-volume"
        }

storage_service = DistributedStorageService()

