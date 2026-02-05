"""
Output validation module -- mirrors OutputValidator from the original notebook.

Provides:
  - Toxicity checking
  - Bias checking
  - PII detection and masking (via spaCy NER)
"""

import logging
from typing import Any, Dict, Tuple

logger = logging.getLogger(__name__)


class OutputValidator:
    """
    Validates agent outputs for safety and privacy.
    Exact port of the notebook OutputValidator, adapted for Django.
    """

    def __init__(self, toxicity_threshold: float = 0.7, bias_threshold: float = 0.7):
        self.toxicity_threshold = toxicity_threshold
        self.bias_threshold = bias_threshold

    def validate(self, agent_response: str, user_query: str = "") -> Tuple[bool, str, Dict[str, Any]]:
        """
        Main validation pipeline.

        Returns: (is_valid, message, details)
        """
        details: Dict[str, Any] = {
            "toxicity_score": 0.0,
            "bias_score": 0.0,
            "pii_masked": False,
        }

        try:
            # 1. Toxicity check
            toxicity_score = self.check_toxicity(agent_response)
            details["toxicity_score"] = round(toxicity_score, 4)
            if toxicity_score > self.toxicity_threshold:
                self._log("output", agent_response, False, f"High toxicity: {toxicity_score:.2f}", details)
                return (
                    False,
                    f"Output validation failed: High toxicity detected (score: {toxicity_score:.2f})",
                    details,
                )

            # 2. Bias check
            bias_score = self.check_bias(user_query, agent_response)
            details["bias_score"] = round(bias_score, 4)
            if bias_score > self.bias_threshold:
                self._log("output", agent_response, False, f"Bias detected: {bias_score:.2f}", details)
                return (
                    False,
                    f"Output validation failed: Potential bias detected (score: {bias_score:.2f})",
                    details,
                )

            # 3. PII masking
            masked_response = self.detect_and_mask_pii(agent_response)
            if masked_response != agent_response:
                details["pii_masked"] = True
                details["masked_response"] = masked_response

            self._log("output", agent_response[:500], True, "Validation passed", details)
            return True, "Output validation passed", details

        except Exception as exc:
            logger.error("Output validation error: %s", exc)
            return False, f"Output validation error: {str(exc)}", details

    def check_toxicity(self, text: str) -> float:
        """Check output toxicity using Detoxify."""
        try:
            from detoxify import Detoxify

            scores = Detoxify("original").predict(text)
            return float(scores["toxicity"])
        except Exception as exc:
            logger.warning("Output toxicity check error: %s", exc)
            return 0.0

    def check_bias(self, query: str, response: str) -> float:
        """
        Check for bias in response.
        Uses a simple heuristic fallback when llm-guard is not available.
        """
        try:
            from llm_guard.output_scanners import Bias

            scanner = Bias()
            _, _, risk_score = scanner.scan(query, response)
            return risk_score
        except ImportError:
            # Fallback: simple keyword-based bias detection
            bias_terms = [
                "always", "never", "all", "none", "every",
                "no one", "everybody", "nobody",
            ]
            response_lower = response.lower()
            bias_count = sum(1 for term in bias_terms if f" {term} " in f" {response_lower} ")
            return min(bias_count * 0.1, 1.0)
        except Exception as exc:
            logger.warning("Bias check error: %s", exc)
            return 0.0

    def detect_and_mask_pii(self, text: str) -> str:
        """Mask PII in text using spaCy NER."""
        try:
            import spacy

            try:
                nlp = spacy.load("en_core_web_sm")
            except OSError:
                logger.warning("spaCy model en_core_web_sm not found; skipping PII masking.")
                return text

            doc = nlp(text)
            masked_text = text

            # Process entities in reverse order to preserve character positions
            for ent in reversed(doc.ents):
                if ent.label_ in ("PERSON", "GPE", "ORG", "DATE", "CARDINAL"):
                    masked_text = (
                        masked_text[: ent.start_char]
                        + "[REDACTED]"
                        + masked_text[ent.end_char:]
                    )

            return masked_text
        except Exception as exc:
            logger.warning("PII masking error: %s", exc)
            return text

    @staticmethod
    def _sanitize_scores(obj):
        """Convert numpy types to native Python types for JSON serialization."""
        import json

        return json.loads(json.dumps(obj, default=lambda x: bool(x) if hasattr(x, 'item') and isinstance(x.item(), bool) else float(x) if hasattr(x, 'item') else str(x)))

    def _log(self, validation_type: str, input_text: str, is_valid: bool, message: str, scores: dict):
        """Create an audit log entry."""
        try:
            from .models import ValidationLog

            safe_scores = self._sanitize_scores(scores) if scores else {}

            ValidationLog.objects.create(
                validation_type=validation_type,
                input_text=input_text[:2000],
                is_valid=bool(is_valid),
                message=message,
                scores=safe_scores,
            )
        except Exception as exc:
            logger.warning("Failed to create validation log: %s", exc)
