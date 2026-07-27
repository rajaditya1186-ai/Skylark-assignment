/**
 * React Hook for managing weekly leadership report state.
 * Handles fetching executive narratives, loading state, and structural meta details.
 */
import { useState, useCallback } from 'react';
import { api } from '../services/api';

export const useLeadershipSummary = () => {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataComplete, setDataComplete] = useState<boolean>(true);
  const [structuredSummary, setStructuredSummary] = useState<any | null>(null);
  const [missingDataNotes, setMissingDataNotes] = useState<string[] | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getLeadershipSummary();
      setNarrative(response.narrative);
      setDataComplete(response.data_complete);
      setStructuredSummary(response.structured_summary);
      setMissingDataNotes(response.missing_data_notes);
    } catch (err: any) {
      console.error('Leadership Summary Error:', err);
      const friendlyMessage = err.detail || 'Could not fetch leadership summary. Please check connection to the backend.';
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSummary = useCallback(() => {
    setNarrative(null);
    setError(null);
    setStructuredSummary(null);
    setMissingDataNotes(null);
  }, []);

  return {
    narrative,
    loading,
    error,
    dataComplete,
    structuredSummary,
    missingDataNotes,
    fetchSummary,
    clearSummary,
  };
};
export type UseLeadershipSummaryReturn = ReturnType<typeof useLeadershipSummary>;
