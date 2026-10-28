'use server';

import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendContactEmailToAdmin, sendContactConfirmationEmail } from '@/lib/services/email';

const ContactSchema = z.object({
  name: z.string().trim().min(2, 'Veuillez saisir votre prénom et nom (au moins 2 caractères).').max(100),
  email: z.string().trim().email('Veuillez saisir une adresse email valide.').max(120),
  category: z.enum([
    'help_genealogy',
    'app_improvement',
    'technical_help',
    'question_other',
  ], {
    errorMap: () => ({ message: 'Veuillez sélectionner une catégorie valide.' }),
  }),
  subject: z.string().trim().min(3, 'Le titre du message doit contenir au moins 3 caractères.').max(150),
  message: z.string().trim().min(10, 'Votre message doit contenir au moins 10 caractères.').max(5000),
});

export interface ContactActionResult {
  success: boolean;
  error?: string;
}

export async function submitContactMessageAction(
  rawInput: Record<string, unknown>
): Promise<ContactActionResult> {
  // Validate input
  const validation = ContactSchema.safeParse(rawInput);
  if (!validation.success) {
    const errorMsg = validation.error.issues.map((i) => i.message).join(' ');
    return { success: false, error: errorMsg };
  }

  const { name, email, category, subject, message } = validation.data;

  // Retrieve authenticated user if available
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const adminClient = createAdminClient();

  // 1. Record contact message in audit_logs for reliability and trace
  try {
    await adminClient.from('audit_logs').insert({
      actor_id: user?.id || null,
      action: 'contact_message_received',
      entity_type: 'contact',
      details: {
        sender_name: name,
        sender_email: email,
        category,
        subject,
        message,
        authenticated_user_id: user?.id || null,
      },
    });
  } catch (logErr) {
    console.error('Failed to log contact message into audit_logs:', logErr);
  }

  // 2. Dispatch email notification to the administrator (Ruben)
  await sendContactEmailToAdmin({
    senderName: name,
    senderEmail: email,
    category,
    subject,
    message,
  });

  // 3. Dispatch automated confirmation email to the sender
  await sendContactConfirmationEmail({
    senderName: name,
    senderEmail: email,
    subject,
  });

  return { success: true };
}
