import type { ReactNode } from "react";
import { IconButton } from "./IconButton";

interface ModalProps {
  children: ReactNode;
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  className?: string;
}

export function Modal({ children, isOpen, title, onClose, className }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        className={[
          "relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] p-6 shadow-xl dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]",
          className ?? "",
        ].join(" ")}
      >
        {title && (
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
              {title}
            </h2>
            <IconButton icon="close" label="Cerrar" onClick={onClose} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
