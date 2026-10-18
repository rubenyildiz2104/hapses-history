'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

export async function signInAction(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Veuillez renseigner votre e-mail et votre mot de passe.' };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  redirect('/compte/propositions');
}

export async function signUpAction(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const displayName = formData.get('displayName') as string;
  const acceptTerms = formData.get('acceptTerms');

  if (!email || !password || !displayName) {
    return { success: false, error: 'Tous les champs sont obligatoires.' };
  }

  if (!acceptTerms) {
    return {
      success: false,
      error: 'Vous devez accepter les conditions d\'utilisation et la politique de confidentialité.',
    };
  }

  if (password.length < 8) {
    return {
      success: false,
      error: 'Le mot de passe doit comporter au moins 8 caractères.',
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        display_name: displayName.trim(),
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/connexion');
}

export async function resetPasswordAction(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get('email') as string;
  if (!email) {
    return { success: false, error: 'Veuillez saisir votre adresse e-mail.' };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
