import { describe, it, expect, vi } from 'vitest';
import {
  sendEmail,
  sendProposalStatusEmail,
  sendContactEmailToAdmin,
  sendContactConfirmationEmail,
  getAdminEmail,
} from '@/lib/services/email';

describe('Email Service', () => {
  it('returns default admin email when not explicitly set', () => {
    expect(getAdminEmail()).toBe('ruben.yldz@gmail.com');
  });

  it('handles dev/fallback mode safely when RESEND_API_KEY is not set', async () => {
    const result = await sendEmail({
      to: 'contributor@example.com',
      subject: 'Test Subject',
      html: '<p>Test html body</p>',
      text: 'Test plain body',
    });

    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('generates proper status notifications for accepted proposals', async () => {
    const result = await sendProposalStatusEmail({
      recipientEmail: 'contributor@example.com',
      recipientName: 'Marie Yildiz',
      proposalId: 'prop_123',
      proposalType: 'add_person',
      decision: 'accept',
      reviewComment: 'Merci pour ces précisions d’état civil.',
      targetPersonName: 'Pierre Yildiz',
    });

    expect(result.success).toBe(true);
  });

  it('generates proper status notifications for needs_information proposals', async () => {
    const result = await sendProposalStatusEmail({
      recipientEmail: 'contributor@example.com',
      recipientName: 'Joseph Yildiz',
      proposalId: 'prop_456',
      proposalType: 'update_person',
      decision: 'needs_information',
      reviewComment: 'Pouvez-vous préciser l’année de naissance avec une source paroissiale ?',
      targetPersonName: 'Hanna Yildiz',
    });

    expect(result.success).toBe(true);
  });

  it('generates proper status notifications for rejected proposals', async () => {
    const result = await sendProposalStatusEmail({
      recipientEmail: 'contributor@example.com',
      recipientName: 'Gabriel',
      proposalId: 'prop_789',
      proposalType: 'add_relationship',
      decision: 'reject',
      reviewComment: 'Ce lien est en contradiction avec le registre de 1895.',
    });

    expect(result.success).toBe(true);
  });

  it('sends contact email to administrator and confirmation to contributor', async () => {
    const adminResult = await sendContactEmailToAdmin({
      senderName: 'Ruben Test',
      senderEmail: 'visitor@example.com',
      category: 'app_improvement',
      subject: 'Ajouter une vue cartographique',
      message: 'Ce serait génial d’ajouter une carte interactive du village avec les maisons des familles.',
    });
    expect(adminResult.success).toBe(true);

    const confResult = await sendContactConfirmationEmail({
      senderName: 'Ruben Test',
      senderEmail: 'visitor@example.com',
      subject: 'Ajouter une vue cartographique',
    });
    expect(confResult.success).toBe(true);
  });
});
