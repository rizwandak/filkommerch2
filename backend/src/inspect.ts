import { query, queryOne } from "./config/database";

async function main() {
  const campaigns = await query<any>(
    "SELECT id, batch_name, start_date, end_date, extended_end_date FROM pre_order_campaigns ORDER BY id ASC"
  );
  console.log("CAMPAIGNS:", campaigns);

  const matchedCamp = campaigns.find((c: any) => String(c.id) === "3" || c.batch_name.toLowerCase() === "batch #2");
  console.log("MATCHED CAMP:", matchedCamp);

  const formatSqlDate = (d: any) => {
    if (!d) return null;
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
    } catch {
      return String(d);
    }
  };

  const startD = formatSqlDate(matchedCamp?.start_date);
  const endD = formatSqlDate(matchedCamp?.extended_end_date || matchedCamp?.end_date);
  console.log("FORMATTED DATES:", { startD, endD });

  const batchConstraint = matchedCamp
    ? `(o.pre_order_campaign_id = ${matchedCamp.id} OR (o.pre_order_campaign_id IS NULL AND o.created_at >= '${startD}' AND o.created_at <= '${endD}'))`
    : "1=1";

  const validPaidCondition = "(o.payment_status = 'paid' OR o.order_status IN ('completed', 'settlement', 'capture')) AND o.order_status NOT IN ('cancelled', 'cancel')";

  const res = await queryOne<any>(`
    SELECT 
      COUNT(CASE WHEN ${validPaidCondition} AND o.order_id NOT LIKE 'LNS%' THEN 1 END) AS total_orders,
      COALESCE(SUM(CASE WHEN ${validPaidCondition} THEN o.gross_amount ELSE 0 END), 0) AS total_revenue
    FROM orders o
    WHERE 1=1 AND ${batchConstraint}
  `);

  console.log("BATCH #2 RESULT:", res);
  process.exit(0);
}

main();
