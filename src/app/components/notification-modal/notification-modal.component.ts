import { Component, Input, Output, EventEmitter, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-modal.component.html',
  styleUrl: './notification-modal.component.scss'
})
export class NotificationModalComponent {
  @Input() isVisible = signal(false);
  @Input() type = signal<NotificationType>('info');
  @Input() title = signal('');
  @Input() message = signal('');
  @Input() autoCloseDelay = signal(0); // 0 = manual close, > 0 = auto close in ms
  
  @Output() closed = new EventEmitter<void>();

  constructor() {
    // Auto-close effect
    effect(() => {
      if (this.isVisible() && this.autoCloseDelay() > 0) {
        setTimeout(() => {
          this.close();
        }, this.autoCloseDelay());
      }
    });
  }

  getIcon(): string {
    switch (this.type()) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  }

  close() {
    this.isVisible.set(false);
    this.closed.emit();
  }
}
