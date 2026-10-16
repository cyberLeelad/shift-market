import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { ShiftMarketWireHttp } from "../generated/wire.ts";

const client = createHttpClient<ShiftMarketWireHttp>({ baseUrl: "/api" });

const reservationForm = document.querySelector<HTMLFormElement>("#reserve")!;
const reservationStatus = document.querySelector<HTMLParagraphElement>("#status")!;
const reservationList = document.querySelector<HTMLUListElement>("#reservations")!;

// RESERVING ======================================================================

async function showReservations() {
  const result = await client.reservations.list({});
  if ("error" in result) {
    reservationStatus.textContent = `Could not load shifts: ${result.error}`;
    return;
  }
  reservationList.replaceChildren(
    ...result.book.reservations.map(({ reservation, user, resource }) => {
      const cancel = document.createElement("button");
      cancel.textContent = "Cancel";
      cancel.addEventListener("click", async () => {
        await client.reservations.cancel({ reservation });
        await showReservations();
      });
      const item = document.createElement("li");
      item.append(`${resource}, held by ${user} `, cancel);
      return item;
    }),
  );
}

reservationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(reservationForm);
  const result = await client.reservations.reserve({
    user: String(data.get("user")),
    resource: String(data.get("resource")),
  });
  reservationStatus.textContent = "error" in result ? `Could not reserve: ${result.error}` : "Reserved!";
  await showReservations();
});

showReservations();


// PROVISIONING ===================================================================

const provisionForm = document.querySelector<HTMLFormElement>("#provision")!; // input "pin"
const provStatus = document.querySelector<HTMLParagraphElement>("#provisionStatus")!;
const shiftList = document.querySelector<HTMLUListElement>("#allShifts")!;

async function showShiftsAsList() {
  const result = await client.shifts.list({});
  if ("error" in result) {
    provStatus.textContent = `Could not load shifts: ${result.error}`;
    return;
  }
  shiftList.replaceChildren(
    ...result.organizer.shifts.map(({ date, end, shift, start }) => {
      const item = document.createElement("li");
      // If I add a repeating symbol, it should go here.
      item.append(`${date}, ${start}-${end}`);
      return item;
    }),
  );
}

// What happens when the button in the provision form is pressed.
provisionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(provisionForm);
  const result = await client.shifts.makeOne({
    date: String(data.get("date")),
    start: String(data.get("start")),
    end: String(data.get("end")),
  });
  provStatus.textContent = "error" in result ? `Could not create shift: ${result.error}` : "Created shift!";
  await showShiftsAsList();
});

showShiftsAsList();