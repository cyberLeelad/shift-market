import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { ReservationsWireHttp } from "../generated/wire.ts";

const client = createHttpClient<ReservationsWireHttp>({ baseUrl: "/api" });

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

/*
const provisionForm = document.querySelector<HTMLFormElement>("#provision")!; // input "pin"
const provStatus = document.querySelector<HTMLParagraphElement>("#provisionstatus")!;
const shiftList = document.querySelector<HTMLUListElement>("#allshifts")!;

async function showShiftsAsList() {
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
  */