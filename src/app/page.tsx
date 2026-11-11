import { LineApp } from "@/features/line/components/LineApp";
import { parseLocation } from "@/features/line/logic";
import { TICKETS } from "@/features/line/tickets";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { ticketId, step } = parseLocation(TICKETS, first(params.t), first(params.s));
  return <LineApp initialTicketId={ticketId} initialStep={step} />;
}
