from duckduckgo_search import DDGS
from typing import List, Dict, Any
import asyncio

class WebSearchService:
    def __init__(self):
        pass

    async def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """Perform a web search using DuckDuckGo"""
        print(f"Searching web for: {query}")
        
        try:
            # parsing needs to be run in executor if it's blocking, but DDGS might be sync
            # DDGS is synchronous by default
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(None, self._run_search, query, max_results)
            return results
        except Exception as e:
            print(f"Web search error: {e}")
            return []

    def _run_search(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        results = []
        with DDGS() as ddgs:
            # text search
            search_gen = ddgs.text(query, max_results=max_results)
            for r in search_gen:
                results.append(r)
        return results

web_search_service = WebSearchService()
