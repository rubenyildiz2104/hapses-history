'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

async function getRequestOrigin(): Promise<string> {
  try {
    const headerList = await headers();
    const host = headerList.get('x-forwarded-host') || headerList.get('host');
    const proto = headerList.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    if (host) {
      return `${proto}://${host}`;
    }
  } catch {
    // fallback if called outside request context
  }
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://hapses-history.vercel.app';
}

function mapAuthError(error: { message: string } | null, defaultMsg: string): string {
  if (!error) return defaultMsg;
  const msg = error.message.toLowerCase();

  if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
    return "Le serveur a temporairement dépassé le quota d'envoi d'e-mails. Veuillez patienter quelques minutes avant de réessayer.";
  }
  if (
    msg.includes('already registered') ||
    msg.includes('user already exists') ||
    msg.includes('already been registered')
  ) {
    return "Un compte est déjà associé à cette adresse e-mail. Veuillez vous connecter ou réinitialiser votre mot de passe.";
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return "Adresse e-mail ou mot de passe incorrect.";
  }
  if (msg.includes('email not confirmed')) {
    return "Votre adresse e-mail n'a pas encore été confirmée. Veuillez vérifier votre boîte de réception (et vos courriers indésirables).";
  }
  if (msg.includes('password should be at least') || msg.includes('weak password')) {
    return "Le mot de passe doit comporter au moins 8 caractères.";
  }
  if (msg.includes('invalid api key')) {
    console.error('[Supabase Auth] Critical: Invalid API Key received from Supabase Auth service.');
    return "Erreur d'authentification serveur. Veuillez réessayer ultérieurement.";
  }

  return error.message;
}

export async function signInAction(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Veuillez renseigner votre e-mail et votre mot de passe.' };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return { success: false, error: mapAuthError(error, 'Échec de connexion.') };
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

  const cleanEmail = email.trim().toLowerCase();
  const cleanDisplayName = displayName.trim();

  try {
    // 1. Create active user via privileged admin client to bypass the free tier 3 emails/hour SMTP rate limit
    const adminClient = createAdminClient();
    const { data, error: adminError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: cleanDisplayName,
      },
    });

    if (adminError) {
      return { success: false, error: mapAuthError(adminError, "Une erreur est survenue lors de l'inscription.") };
    }

    if (!data.user) {
      return { success: false, error: "Impossible de créer le compte utilisateur." };
    }

    return { success: true };
  } catch (err) {
    console.warn('[signUpAction] Admin user creation failed, falling back to standard signUp:', err);

    const origin = await getRequestOrigin();
    const emailRedirectTo = `${origin}/auth/callback?next=/compte/propositions`;

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo,
        data: {
          display_name: cleanDisplayName,
        },
      },
    });

    if (error) {
      return { success: false, error: mapAuthError(error, "Une erreur est survenue lors de l'inscription.") };
    }

    return { success: true };
  }
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

  const origin = await getRequestOrigin();
  const redirectTo = `${origin}/auth/callback?next=/compte/reinitialiser-mot-de-passe`;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });

  if (error) {
    return { success: false, error: mapAuthError(error, "Impossible de réinitialiser le mot de passe.") };
  }

  return { success: true };
}

export async function updatePasswordAction(formData: FormData): Promise<AuthActionResult> {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || !confirmPassword) {
    return { success: false, error: 'Veuillez saisir et confirmer votre nouveau mot de passe.' };
  }

  if (password.length < 8) {
    return { success: false, error: 'Le mot de passe doit comporter au moins 8 caractères.' };
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Les deux mots de passe ne correspondent pas.' };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { success: false, error: mapAuthError(error, 'Impossible de mettre à jour le mot de passe.') };
  }

  return { success: true };
}
