export type TicketRole = 'student' | 'guest';

export interface Ceremony {
  id: string;
  name: string;
  venue: string;
  scheduledAt: string; // ISO timestamp
  timezone: string;
  templateId?: string;
}

export interface CsvStudentRow {
  studentId: string;
  fullName: string;
  documentNumber: string;
  programName: string;
  ceremonyId: string;
  guestOneName?: string;
  guestOneDocument?: string;
  guestTwoName?: string;
  guestTwoDocument?: string;
}

export interface TicketTemplate {
  id: string;
  name: string;
  type: 'html' | 'image';
  backgroundUrl?: string;
  htmlMarkup?: string;
  cssStyles?: string;
  qrPosition: {
    x: number; // percentage 0 - 100
    y: number;
    size: number; // percentage relative to width
  };
  fontFamily?: string;
  updatedAt: string;
  createdBy: string;
}

export interface TicketAssignment {
  id: string;
  ceremonyId: string;
  studentId: string;
  inviteeId: string;
  role: TicketRole;
  qrCode: string; // data URL
  templateId: string;
  downloadUrl?: string;
}

export interface Invitee {
  id: string;
  name: string;
  documentNumber?: string;
  ceremonyId: string;
  ticketCode: string;
  role: TicketRole;
  studentId: string;
  programName?: string;
  guestIndex?: number;
  qrCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  studentId: string;
  fullName: string;
  documentNumber: string;
  programName: string;
  ceremonyId: string;
  invitees: Invitee[];
  createdAt: string;
  updatedAt: string;
}

export interface AccessLog {
  id: string;
  inviteeId: string;
  ticketCode: string;
  ceremonyId: string;
  scannedAt: string;
  location?: string;
  operator: string;
  source: 'scanner' | 'manual';
}

export interface OfflineCheckInPayload {
  inviteeId: string;
  ceremonyId: string;
  ticketCode: string;
  scannedAt: string;
  source: 'scanner' | 'manual';
}

export interface PendingSyncRecord extends OfflineCheckInPayload {
  id: string;
  retryCount: number;
  lastTriedAt?: string;
}
