import { EventEmitter } from 'events';

// Create event emitters for modules that don't have them yet
export const authEvents = new EventEmitter();
export const venueEvents = new EventEmitter();

// Re-export or import other emitters if needed, or define them here.
// To keep things clean, authEvents and venueEvents are defined here.
// Booking and Payment modules already have their emitters, but we will
// listen to them in the notification service, making notification decoupled.
