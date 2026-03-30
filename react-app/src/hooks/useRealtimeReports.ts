import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeReports(userId: string | undefined) {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    supabase.from('news_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setReports(data || []));

    // Listen to changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'news_reports', filter: `user_id=eq.${userId}` },
        (payload) => {
          setReports((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return reports;
}
