import type { Ceremony, Invitee, TicketTemplate } from '@/types';

const tokenRegex = (token: string) => new RegExp(`{{\\s*${token}\\s*}}`, 'g');

const normaliseRole = (role: string) => {
  return role === 'student' ? 'Estudiante' : 'Invitado';
};

export const getTemplateHtml = (
  template: TicketTemplate,
  invitee: Invitee,
  ceremony?: Ceremony,
) => {
  if (!template.htmlMarkup) {
    return '';
  }

  const replacements: Record<string, string> = {
    'invitee.name': invitee.name,
    'invitee.ticketCode': invitee.ticketCode,
    'invitee.role': normaliseRole(invitee.role),
    'invitee.documentNumber': invitee.documentNumber ?? '',
    'invitee.programa': invitee.programa ?? '',
    'student.programa': invitee.programa ?? '',
    'ceremony.name': ceremony?.name ?? '',
    'ceremony.venue': ceremony?.venue ?? '',
    'ceremony.date': ceremony ? new Date(ceremony.scheduledAt).toLocaleDateString() : '',
  };

  let html = template.htmlMarkup;
  Object.entries(replacements).forEach(([token, value]) => {
    html = html.replace(tokenRegex(token), value);
  });

  return html;
};

export const getTemplateCss = (template: TicketTemplate) => template.cssStyles ?? '';

