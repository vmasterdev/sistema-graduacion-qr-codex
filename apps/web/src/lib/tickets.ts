import QRCode from 'qrcode';
import { Invitee, TicketAssignment, TicketTemplate } from '@/types';

export const generateTicketCode = (ceremonyId: string, seed?: string) => {
  const base = seed ?? crypto.randomUUID();
  return `${ceremonyId}-${base}`;
};

export const createQrDataUrl = async (value: string) => {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'H',
    scale: 8,
    margin: 1,
  });
};

export const mapInviteeToTicket = async (
  invitee: Invitee,
  template: TicketTemplate,
): Promise<TicketAssignment> => {
  const qrCode = await createQrDataUrl(invitee.ticketCode);

  return {
    id: `${invitee.id}-${template.id}`,
    ceremonyId: invitee.ceremonyId,
    studentId: invitee.idEstudiante,
    inviteeId: invitee.id,
    role: invitee.role,
    qrCode,
    templateId: template.id,
  };
};
