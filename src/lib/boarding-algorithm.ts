export interface BookingData {
  booking_id: string;
  seats: string[];
}

export interface BoardingSequence {
  sequence: number;
  booking_id: string;
  seats: string[];
  furthest_seat: string;
  seat_distance: number;
}

/**
 * Extracts the distance (row number) from a seat label and column position
 * Examples: A1 -> row 1, B20 -> row 20, C5 -> row 5
 * Bus layout: A|B | C|D (4 columns, aisle between B and C)
 */
function getSeatDistance(seat: string): number {
  const match = seat.match(/([ABCD])(\d+)/);
  if (!match) return 0;
  
  const column = match[1];
  const row = parseInt(match[2], 10);
  
  // For boarding optimization, row number is the primary factor
  // Higher row numbers are further from the front entry
  return row;
}

/**
 * Gets the column position for aisle consideration
 * A, B = left side of aisle; C, D = right side of aisle
 */
function getSeatColumn(seat: string): 'left' | 'right' | 'unknown' {
  const column = seat.match(/([ABCD])/)?.[1];
  if (column === 'A' || column === 'B') return 'left';
  if (column === 'C' || column === 'D') return 'right';
  return 'unknown';
}

/**
 * Finds the seat furthest from the front entry for a booking
 */
function getFurthestSeat(seats: string[]): { seat: string; distance: number } {
  let furthestSeat = seats[0];
  let maxDistance = getSeatDistance(seats[0]);

  for (const seat of seats) {
    const distance = getSeatDistance(seat);
    if (distance > maxDistance) {
      maxDistance = distance;
      furthestSeat = seat;
    }
  }

  return { seat: furthestSeat, distance: maxDistance };
}

/**
 * Parses CSV content into booking data
 */
export function parseCSVData(csvContent: string): BookingData[] {
  const lines = csvContent.trim().split('\n');
  const bookings: BookingData[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [booking_id, seatsStr] = line.split(/\s+/);
    if (booking_id && seatsStr) {
      const seats = seatsStr.split(',').map(s => s.trim());
      bookings.push({ booking_id, seats });
    }
  }

  return bookings;
}

/**
 * Generates optimal boarding sequence using back-to-front strategy
 */
export function generateBoardingSequence(bookings: BookingData[]): BoardingSequence[] {
  const sequenceData = bookings.map(booking => {
    const { seat: furthestSeat, distance } = getFurthestSeat(booking.seats);
    return {
      booking_id: booking.booking_id,
      seats: booking.seats,
      furthest_seat: furthestSeat,
      seat_distance: distance,
    };
  });

  // Sort by seat distance (descending) and booking ID (ascending) for ties
  sequenceData.sort((a, b) => {
    if (a.seat_distance !== b.seat_distance) {
      return b.seat_distance - a.seat_distance; // Descending order (back to front)
    }
    return parseInt(a.booking_id) - parseInt(b.booking_id); // Ascending order for booking IDs
  });

  // Add sequence numbers
  return sequenceData.map((item, index) => ({
    sequence: index + 1,
    ...item,
  }));
}

/**
 * Converts boarding sequence to CSV format for download
 */
export function sequenceToCSV(sequence: BoardingSequence[]): string {
  const header = 'Seq,Booking_ID,Seats,Furthest_Seat';
  const rows = sequence.map(item => 
    `${item.sequence},${item.booking_id},"${item.seats.join(',')}",${item.furthest_seat}`
  );
  return [header, ...rows].join('\n');
}