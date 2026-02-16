// lib/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager';
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // Try to get profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profile) {
          setUser(profile);
        } else {
          // Create default profile if doesn't exist
          const newProfile = {
            id: authUser.id,
            email: authUser.email!,
            full_name: authUser.email!.split('@')[0],
            role: 'manager' as const,
          };
          
          await supabase.from('user_profiles').insert([newProfile]);
          setUser(newProfile);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, isAdmin: user?.role === 'admin' };
}