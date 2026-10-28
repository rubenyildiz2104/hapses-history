/**
 * Email Notification Service for Habses
 * Handles proposal status updates, contact messages, and transactional alerts.
 * Uses Resend API if RESEND_API_KEY is configured, with safe local logging fallback.
 */

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

const DEFAULT_ADMIN_EMAIL = 'ruben.yldz@gmail.com';

export function getAdminEmail(): string {
  return process.env.ADMIN_CONTACT_EMAIL || DEFAULT_ADMIN_EMAIL;
}

/**
 * Low-level email sender.
 * Uses Resend API via native fetch if RESEND_API_KEY is present,
 * or logs cleanly in dev mode without throwing errors.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'Habses Mémoire & Familles <notifications@habses.org>';

  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  if (!apiKey) {
    // Development / fallback mode: log without failing
    console.log('\n======================================================');
    console.log('📨 [EMAIL SERVICE - DEV MODE / NO RESEND_API_KEY]');
    console.log(`To: ${recipients.join(', ')}`);
    console.log(`Subject: ${options.subject}`);
    if (options.replyTo) console.log(`Reply-To: ${options.replyTo}`);
    console.log('--- Body Preview ---');
    console.log(options.text || options.html.replace(/<[^>]+>/g, ' ').slice(0, 300) + '...');
    console.log('======================================================\n');

    return {
      success: true,
      simulated: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Failed to send email via Resend:', errorData);
      return {
        success: false,
        error: errorData?.message || `HTTP error ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      messageId: data.id,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown email sending error';
    console.error('Email sending exception:', errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Standard branded HTML email template wrapper.
 */
function wrapHtmlEmail(title: string, contentHtml: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://habses.org';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #231d17;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f5f0; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e7ded2; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td style="background-color: #2b2319; padding: 24px 32px; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: bold; color: #fbf9f5; letter-spacing: -0.5px;">Habses</span>
                    <br>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #d0c2b2;">Histoire & Familles</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #faf7f2; border-top: 1px solid #eee7dc; padding: 20px 32px; text-align: center; font-size: 12px; color: #7c7063; line-height: 1.5;">
              <p style="margin: 0 0 6px 0;">
                Projet collaboratif de mémoire et d'histoire du village d'Habses.
              </p>
              <p style="margin: 0;">
                <a href="${siteUrl}" style="color: #634f3b; text-decoration: underline;">Consulter le site</a> &nbsp;•&nbsp; 
                <a href="${siteUrl}/compte/propositions" style="color: #634f3b; text-decoration: underline;">Mes propositions</a> &nbsp;•&nbsp;
                <a href="${siteUrl}/contact" style="color: #634f3b; text-decoration: underline;">Contact</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send email notification to a user regarding the review of their proposal.
 */
export async function sendProposalStatusEmail(params: {
  recipientEmail: string;
  recipientName: string;
  proposalId: string;
  proposalType: string;
  decision: 'accept' | 'reject' | 'needs_information';
  reviewComment?: string | null;
  targetPersonName?: string | null;
}): Promise<SendEmailResult> {
  const { recipientEmail, recipientName, proposalId, proposalType, decision, reviewComment, targetPersonName } = params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const typeLabels: Record<string, string> = {
    add_person: 'Ajout d’une personne',
    update_person: 'Correction d’une fiche',
    add_relationship: 'Création d’un lien familial',
    update_relationship: 'Modification d’un lien familial',
  };
  const typeLabel = typeLabels[proposalType] || 'Proposition de contribution';

  let subject = '';
  let statusBadgeHtml = '';
  let decisionTitle = '';
  let decisionDescHtml = '';
  let ctaButtonHtml = '';

  const proposalLink = `${siteUrl}/compte/propositions`;
  const editLink = `${siteUrl}/proposer?editProposalId=${proposalId}`;

  if (decision === 'accept') {
    subject = `[Habses] Votre proposition a été validée !`;
    statusBadgeHtml = `
      <span style="display: inline-block; background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
        ✓ Validée & Intégrée
      </span>
    `;
    decisionTitle = `Félicitations, votre proposition a été acceptée !`;
    decisionDescHtml = `
      <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 12px 0;">
        Votre contribution a été vérifiée par l'administration et ajoutée officiellement à l'arbre généalogique et aux archives d'Habses.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 12px 0;">
        Grâce à votre aide, la mémoire collective des familles du village continue de s'enrichir pour les générations actuelles et futures.
      </p>
    `;
    ctaButtonHtml = `
      <a href="${siteUrl}/genealogie" style="display: inline-block; background-color: #2b2319; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
        Consulter l’arbre généalogique →
      </a>
    `;
  } else if (decision === 'needs_information') {
    subject = `[Habses] Précisions demandées pour votre proposition`;
    statusBadgeHtml = `
      <span style="display: inline-block; background-color: #fefce8; color: #854d0e; border: 1px solid #fde047; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
        ⏳ Compléments demandés
      </span>
    `;
    decisionTitle = `Des informations complémentaires sont souhaitées`;
    decisionDescHtml = `
      <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 12px 0;">
        L'administrateur a examiné votre proposition et a besoin de quelques précisions ou de références supplémentaires avant de pouvoir la valider.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 12px 0;">
        Vous pouvez modifier directement votre fiche en un clic à l'aide du bouton ci-dessous :
      </p>
    `;
    ctaButtonHtml = `
      <a href="${editLink}" style="display: inline-block; background-color: #854d0e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
        Compléter ma proposition →
      </a>
    `;
  } else {
    // reject
    subject = `[Habses] Suivi de votre proposition de contribution`;
    statusBadgeHtml = `
      <span style="display: inline-block; background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
        Non retenue
      </span>
    `;
    decisionTitle = `Votre proposition n'a pas pu être retenue`;
    decisionDescHtml = `
      <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 12px 0;">
        L'administrateur a analysé votre proposition mais n'a pas pu la valider en l'état au regard des sources d'archives disponibles ou des critères de cohérence généalogique.
      </p>
    `;
    ctaButtonHtml = `
      <a href="${proposalLink}" style="display: inline-block; background-color: #4b5563; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
        Voir l’historique de mes propositions →
      </a>
    `;
  }

  const commentBlockHtml = reviewComment ? `
    <div style="margin: 20px 0; padding: 16px; background-color: #fdfaf6; border-left: 4px solid #8c6a46; border-radius: 4px;">
      <p style="margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; font-weight: bold; color: #725332; letter-spacing: 0.5px;">
        Message de l'administrateur :
      </p>
      <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 14px; font-style: italic; color: #231d17; line-height: 1.5;">
        « ${reviewComment.replace(/</g, '&lt;').replace(/>/g, '&gt;')} »
      </p>
    </div>
  ` : '';

  const detailsHtml = `
    <div style="margin: 16px 0 24px 0; padding: 16px; background-color: #faf7f2; border: 1px solid #ede5d8; border-radius: 8px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px;">
        <tr>
          <td style="color: #7c7063; padding: 4px 0; width: 140px;">Type de proposition :</td>
          <td style="font-weight: 600; color: #231d17; padding: 4px 0;">${typeLabel}</td>
        </tr>
        ${targetPersonName ? `
        <tr>
          <td style="color: #7c7063; padding: 4px 0;">Personne concernée :</td>
          <td style="font-weight: 600; color: #231d17; padding: 4px 0;">${targetPersonName}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="color: #7c7063; padding: 4px 0;">Statut :</td>
          <td style="padding: 4px 0;">${statusBadgeHtml}</td>
        </tr>
      </table>
    </div>
  `;

  const bodyHtml = `
    <p style="font-size: 15px; color: #231d17; margin: 0 0 16px 0;">
      Bonjour <strong>${recipientName}</strong>,
    </p>

    <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; color: #1e1913; margin: 0 0 12px 0;">
      ${decisionTitle}
    </h2>

    ${detailsHtml}

    ${decisionDescHtml}

    ${commentBlockHtml}

    <div style="margin: 28px 0 12px 0; text-align: center;">
      ${ctaButtonHtml}
    </div>
  `;

  const html = wrapHtmlEmail(subject, bodyHtml);
  const text = `
Bonjour ${recipientName},

${decisionTitle}

Type de proposition: ${typeLabel}
${targetPersonName ? `Personne: ${targetPersonName}\n` : ''}Statut: ${decision}

${reviewComment ? `Message de l'administrateur:\n« ${reviewComment} »\n\n` : ''}Consultez vos propositions sur: ${proposalLink}
  `.trim();

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
  });
}

/**
 * Send an email to the administrator when a user submits a message via the Contact page.
 */
export async function sendContactEmailToAdmin(params: {
  senderName: string;
  senderEmail: string;
  category: string;
  subject: string;
  message: string;
}): Promise<SendEmailResult> {
  const { senderName, senderEmail, category, subject, message } = params;
  const adminEmail = getAdminEmail();

  const categoryLabels: Record<string, string> = {
    help_genealogy: 'Aide généalogique & archives',
    app_improvement: 'Amélioration de l’application',
    technical_help: 'Aide technique / développement / traduction',
    question_other: 'Autre question',
  };
  const categoryLabel = categoryLabels[category] || category;

  const emailSubject = `[Habses Contact] [${categoryLabel}] ${subject}`;

  const bodyHtml = `
    <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; color: #1e1913; margin: 0 0 16px 0;">
      Nouveau message reçu via la page Contact
    </h2>

    <div style="margin: 16px 0; padding: 16px; background-color: #faf7f2; border: 1px solid #ede5d8; border-radius: 8px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px;">
        <tr>
          <td style="color: #7c7063; padding: 4px 0; width: 120px;">Expéditeur :</td>
          <td style="font-weight: 600; color: #231d17; padding: 4px 0;">${senderName}</td>
        </tr>
        <tr>
          <td style="color: #7c7063; padding: 4px 0;">Email :</td>
          <td style="font-weight: 600; color: #231d17; padding: 4px 0;">
            <a href="mailto:${senderEmail}" style="color: #634f3b;">${senderEmail}</a>
          </td>
        </tr>
        <tr>
          <td style="color: #7c7063; padding: 4px 0;">Catégorie :</td>
          <td style="font-weight: 600; color: #231d17; padding: 4px 0;">${categoryLabel}</td>
        </tr>
        <tr>
          <td style="color: #7c7063; padding: 4px 0;">Objet :</td>
          <td style="font-weight: 600; color: #231d17; padding: 4px 0;">${subject}</td>
        </tr>
      </table>
    </div>

    <div style="margin: 20px 0; padding: 18px; background-color: #ffffff; border: 1px solid #e7ded2; border-radius: 8px; line-height: 1.6; font-size: 14px; color: #231d17; white-space: pre-wrap;">
${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    </div>

    <p style="font-size: 13px; color: #7c7063; margin-top: 20px;">
      Vous pouvez répondre directement à cet email pour contacter <strong>${senderName}</strong> (${senderEmail}).
    </p>
  `;

  return sendEmail({
    to: adminEmail,
    replyTo: senderEmail,
    subject: emailSubject,
    html: wrapHtmlEmail(emailSubject, bodyHtml),
    text: `
Nouveau message de contact :
Expéditeur: ${senderName} (${senderEmail})
Catégorie: ${categoryLabel}
Objet: ${subject}

Message:
${message}
    `.trim(),
  });
}

/**
 * Send an automated confirmation email to the user when they submit a message via Contact.
 */
export async function sendContactConfirmationEmail(params: {
  senderName: string;
  senderEmail: string;
  subject: string;
}): Promise<SendEmailResult> {
  const { senderName, senderEmail, subject } = params;

  const emailSubject = `[Habses] Message bien reçu : ${subject}`;

  const bodyHtml = `
    <p style="font-size: 15px; color: #231d17; margin: 0 0 16px 0;">
      Bonjour <strong>${senderName}</strong>,
    </p>

    <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; color: #1e1913; margin: 0 0 12px 0;">
      Merci d'avoir pris contact avec l'administration d'Habses
    </h2>

    <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 12px 0;">
      Nous avons bien reçu votre message concernant : <strong>« ${subject} »</strong>.
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 12px 0;">
      L'administrateur du projet (Ruben) en prendra connaissance dès que possible et reviendra vers vous si nécessaire. Merci chaleureusement pour votre intérêt et votre volonté d'aider à préserver et faire vivre la mémoire du village.
    </p>
  `;

  return sendEmail({
    to: senderEmail,
    subject: emailSubject,
    html: wrapHtmlEmail(emailSubject, bodyHtml),
    text: `
Bonjour ${senderName},

Nous avons bien reçu votre message concernant : « ${subject} ».
L'administrateur du projet en prendra connaissance dès que possible.

Merci pour votre aide et votre engagement pour le village d'Habses !
    `.trim(),
  });
}
