'use client';
/* eslint-disable @next/next/no-img-element */

import { forwardRef } from 'react';
import type { Ceremony, Invitee, TicketTemplate } from '@/types';
import { getTemplateCss, getTemplateHtml } from '@/lib/template-renderer';

interface TicketCanvasProps {
  invitee: Invitee;
  template: TicketTemplate;
  ceremony?: Ceremony;
}

export const TicketCanvas = forwardRef<HTMLDivElement, TicketCanvasProps>(
  ({ invitee, template, ceremony }, ref) => {
    if (template.type === 'html') {
      const html = getTemplateHtml(template, invitee, ceremony);
      const css = getTemplateCss(template);
      return (
        <div
          ref={ref}
          className="relative w-[860px] overflow-hidden rounded-[32px] bg-white text-slate-900"
          style={{ aspectRatio: '16 / 10', fontFamily: template.fontFamily ?? 'Inter, sans-serif' }}
        >
          <style suppressHydrationWarning>{css}</style>
          <div dangerouslySetInnerHTML={{ __html: html }} />
          <img
            src={invitee.qrCode}
            alt={`QR ${invitee.name}`}
            className="absolute rounded-xl bg-white/90 p-2 shadow-xl"
            style={{
              left: `${template.qrPosition.x}%`,
              top: `${template.qrPosition.y}%`,
              width: `${template.qrPosition.size}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className="relative w-[860px] overflow-hidden rounded-[32px] border border-slate-200 bg-slate-900 text-white"
        style={{
          aspectRatio: '16 / 10',
          backgroundImage: template.backgroundUrl ? `url(${template.backgroundUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: template.fontFamily ?? 'Inter, sans-serif',
        }}
      >
        <div className="absolute inset-0 bg-slate-950/30" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-emerald-200">Ingreso oficial</p>
            <h1 className="mt-3 text-4xl font-semibold">{invitee.name}</h1>
            <p className="mt-1 text-lg capitalize text-slate-200">
              {invitee.role === 'student' ? 'Estudiante' : 'Invitado'} · {ceremony?.name}
            </p>
          </div>
          <div className="text-sm text-slate-200">
            <p>{ceremony?.venue}</p>
            <p>{ceremony ? new Date(ceremony.scheduledAt).toLocaleString() : ''}</p>
            <p className="text-xs text-slate-300/70">Presenta el código QR para ingresar. Código: {invitee.ticketCode}</p>
          </div>
        </div>
        <img
          src={invitee.qrCode}
          alt={`QR ${invitee.name}`}
          className="absolute rounded-xl bg-white/95 p-2 shadow-xl"
          style={{
            left: `${template.qrPosition.x}%`,
            top: `${template.qrPosition.y}%`,
            width: `${template.qrPosition.size}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>
    );
  },
);

TicketCanvas.displayName = 'TicketCanvas';
