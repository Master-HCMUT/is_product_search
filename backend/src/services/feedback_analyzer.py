"""
Feedback analyzer service: uses LangChain + Gemini to analyze search feedback.
Supports per-item analysis and batch pattern detection.
"""

from langchain_google_genai import ChatGoogleGenerativeAI
from loguru import logger

from src.settings import settings


class FeedbackAnalyzer:
    """Analyzes search feedback using Gemini LLM."""

    def __init__(self):
        self._llm = None

    @property
    def llm(self):
        if self._llm is None:
            self._llm = ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL_ID,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.3,
            )
        return self._llm

    async def analyze_single(self, feedback_entry: dict) -> str:
        """
        Analyze a single search feedback entry and explain why the user gave the feedback.
        
        Args:
            feedback_entry: Dict with keys: query, search_type, result_ids, feedback_text, was_match
        
        Returns:
            LLM-generated explanation string.
        """
        prompt = f"""You are a search quality analyst for an e-commerce fashion platform.
Analyze the following search feedback and provide a concise explanation of:
1. Why the user might have given this feedback
2. What went wrong (or right) with the search results
3. Suggestions for improving search quality

Search Query: "{feedback_entry.get('query', 'N/A')}"
Search Type: {feedback_entry.get('search_type', 'text')}
Number of Results: {feedback_entry.get('result_count', 0)}
Was Match: {feedback_entry.get('was_match', False)}
User Feedback: "{feedback_entry.get('feedback_text', 'No feedback provided')}"

Provide your analysis in 2-3 paragraphs. Be specific and actionable."""

        try:
            response = await self.llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            logger.error(f"Single feedback analysis failed: {e}")
            return f"Analysis failed: {str(e)}"

    async def analyze_batch(self, feedback_entries: list[dict]) -> str:
        """
        Analyze multiple feedback entries to identify patterns.
        
        Args:
            feedback_entries: List of feedback dicts.
        
        Returns:
            LLM-generated batch analysis report.
        """
        if not feedback_entries:
            return "No feedback entries to analyze."

        # Build summary of feedback entries
        entries_text = []
        for i, entry in enumerate(feedback_entries[:50], 1):  # Limit to 50 entries
            entries_text.append(
                f"{i}. Query: \"{entry.get('query', 'N/A')}\" | "
                f"Match: {entry.get('was_match', False)} | "
                f"Results: {entry.get('result_count', 0)} | "
                f"Feedback: \"{entry.get('feedback_text', 'N/A')}\""
            )

        prompt = f"""You are a search quality analyst for an e-commerce fashion platform.
Analyze the following batch of {len(feedback_entries)} search feedback entries and provide a comprehensive report.

FEEDBACK ENTRIES:
{chr(10).join(entries_text)}

Your report should include:
1. **Overall Search Quality**: Success rate and general assessment
2. **Common Patterns**: Identify recurring issues or themes in the feedback
3. **Top Problem Areas**: What types of queries fail most often?
4. **Root Cause Analysis**: Why are these patterns occurring?
5. **Recommendations**: Specific, actionable improvements for the search system

Format your response as a structured report with headers and bullet points."""

        try:
            response = await self.llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            logger.error(f"Batch feedback analysis failed: {e}")
            return f"Batch analysis failed: {str(e)}"


feedback_analyzer = FeedbackAnalyzer()
