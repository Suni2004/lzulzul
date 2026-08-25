/**
 * Loads a single event without the caller needing to know where it lives.
 *
 * An ID either belongs to the app's own store or to one of the phone's
 * calendars; the screens that open an event should not have to care which.
 */

import * as local from '../local/events';
import { getEvent } from './api';
import type { CalEvent } from './types';

export async function readEvent(id: string): Promise<CalEvent | null> {
  return local.isLocalId(id) ? local.getLocalEvent(id) : getEvent(id);
}
