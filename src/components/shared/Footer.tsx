import React from 'react';

interface FooterProps {
  /** Pass "admin" to render a more compact variant for the admin panel. */
  variant?: 'customer' | 'admin';
  className?: string;
}

/**
 * Shared footer used across the Customer web app and the Admin panel.
 * Keeps the developer credit consistent, subtle, and professional.
 */
export function Footer({ variant = 'customer', className = '' }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={`w-full border-t border-charcoal-800/10 bg-charcoal-900 py-4 text-center text-xs text-charcoal-100/70 ${className}`}
    >
      {variant === 'customer' && (
        <p className="mb-1 text-charcoal-100/50">© {year} All rights reserved.</p>
      )}
      <p>
        Developed by{' '}
        <span className="font-semibold text-accent-400">ZAP Tech — Zohaib Ahmed Patoli</span>
      </p>
    </footer>
  );
}

export default Footer;
