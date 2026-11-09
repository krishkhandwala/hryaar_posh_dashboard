import uuid
from datetime import datetime
from typing import Dict, Any, List

STATUTORY_POSH_QUIZ_QUESTIONS = [
    {
        "id": "q1",
        "scenario": "During an annual performance appraisal discussion, a senior team leader intimates to a direct report that their promotion will be expedited if they agree to join them for private drinks and weekend offsite trips. What form of sexual harassment does this constitute under the PoSH Act 2013?",
        "options": [
            {"key": "A", "text": "Quid Pro Quo Harassment (Implied or explicit promise of preferential employment benefit in exchange for sexual favors)"},
            {"key": "B", "text": "Innocuous informal workplace bonding not covered under statutory laws"},
            {"key": "C", "text": "General managerial performance management discretion"},
            {"key": "D", "text": "Secondary employment grievance falling solely under labor dispute acts"}
        ],
        "correct": "A",
        "explanation": "Section 3(2)(i) of the PoSH Act 2013 explicitly defines 'implied or explicit promise of preferential treatment in employment' as prohibited sexual harassment (Quid Pro Quo)."
    },
    {
        "id": "q2",
        "scenario": "An employee experiences persistent unwelcome sexually suggestive comments and unsolicited personal photos on work messaging apps. Within what statutory timeframe should a formal complaint be lodged with the Internal Committee (IC)?",
        "options": [
            {"key": "A", "text": "Within 30 days of the incident"},
            {"key": "B", "text": "Within 3 months (90 days) from the date of the incident or last incident in a series"},
            {"key": "C", "text": "Within 1 calendar year"},
            {"key": "D", "text": "Only at the end of the annual compliance mandate"}
        ],
        "correct": "B",
        "explanation": "Under Section 9(1) of the PoSH Act, an aggrieved woman must submit a written complaint within 3 months, extendable by up to another 3 months by the IC upon recording justified reasons."
    },
    {
        "id": "q3",
        "scenario": "Before initiating a formal inquiry under Section 11, the aggrieved complainant requests the Internal Committee to facilitate an amicable resolution without monetary settlement. Is this legally permissible?",
        "options": [
            {"key": "A", "text": "Yes, Section 10 permits conciliation at the request of the aggrieved woman, provided no monetary settlement is made"},
            {"key": "B", "text": "No, formal disciplinary punishment must be compulsorily ordered in every instance"},
            {"key": "C", "text": "Yes, provided the respondent pays compensation directly to the company"},
            {"key": "D", "text": "Conciliation is only permissible if approved by external police authorities"}
        ],
        "correct": "A",
        "explanation": "Section 10(1) allows the IC, at the written request of the aggrieved woman, to take steps to settle the matter through conciliation before initiating inquiry, provided no monetary settlement shall be made as a basis of conciliation."
    },
    {
        "id": "q4",
        "scenario": "An Internal Committee (IC) must be gazetted by every employer having 10 or more employees. What are the mandatory minimum statutory composition requirements under Section 4?",
        "options": [
            {"key": "A", "text": "Any 3 senior managers nominated by the Chief Executive"},
            {"key": "B", "text": "A Presiding Officer who is a senior woman employee, minimum 2 employee members, at least 1 external member from an NGO/legal background, and at least 50% women members"},
            {"key": "C", "text": "An external legal counsel acting as sole arbitrator"},
            {"key": "D", "text": "Equal representation from labor trade unions and factory inspectors"}
        ],
        "correct": "B",
        "explanation": "Section 4(2) mandates a senior woman Presiding Officer, at least 2 members committed to women's causes, 1 external NGO/legal expert, with at least one-half of the total members being women."
    },
    {
        "id": "q5",
        "scenario": "A colleague observes another team member being repeatedly touched inappropriately by a contractor in the office cafeteria. What is the colleague's civic and statutory responsibility under corporate bystander policy?",
        "options": [
            {"key": "A", "text": "Ignore the situation since it did not involve them directly"},
            {"key": "B", "text": "Support the affected colleague, intervene safely if possible, and guide them to confidential reporting channels or file an informed bystander disclosure with the IC"},
            {"key": "C", "text": "Post details of the incident on public social media channels"},
            {"key": "D", "text": "Confront the contractor aggressively outside company premises"}
        ],
        "correct": "B",
        "explanation": "Active bystander intervention encourages employees to safely intervene, document observations, and guide aggrieved colleagues to the IC while upholding confidentiality under Section 16."
    }
]

class PoSHQuizService:
    @staticmethod
    def get_questions() -> List[Dict[str, Any]]:
        # Return questions without exposing correct answer keys to client
        sanitized = []
        for q in STATUTORY_POSH_QUIZ_QUESTIONS:
            sanitized.append({
                "id": q["id"],
                "scenario": q["scenario"],
                "options": q["options"],
            })
        return sanitized

    @staticmethod
    def evaluate_quiz(submitted_answers: Dict[str, str]) -> Dict[str, Any]:
        total_questions = len(STATUTORY_POSH_QUIZ_QUESTIONS)
        correct_count = 0
        detailed_feedback = []

        for q in STATUTORY_POSH_QUIZ_QUESTIONS:
            user_answer = submitted_answers.get(q["id"])
            is_correct = (user_answer == q["correct"])
            if is_correct:
                correct_count += 1
            detailed_feedback.append({
                "id": q["id"],
                "user_answer": user_answer,
                "correct_answer": q["correct"],
                "is_correct": is_correct,
                "explanation": q["explanation"]
            })

        score_pct = round((correct_count / total_questions) * 100, 1)
        passed = (score_pct >= 70.0)

        return {
            "score": score_pct,
            "correct_count": correct_count,
            "total_questions": total_questions,
            "passed": passed,
            "passing_threshold": 70.0,
            "feedback": detailed_feedback
        }

