import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@frontend/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@frontend/components/ui/tabs";
import { Badge } from "@frontend/components/ui/badge";
import {
  getOnlineOrders,
  getOfflineSales,
  type Order,
  type OfflineSale,
} from "@backend/server-actions";

export const Route = createFileRoute("/admin/transactions")({
  component: AdminTransactionsPage,
  head: () => ({ meta: [{ title: "Transaksi — Admin Panel" }] }),
});

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  settlement: "bg-green-100 text-green-800",
  capture: "bg-green-100 text-green-800",
  expire: "bg-red-100 text-red-800",
  cancel: "bg-gray-100 text-gray-600",
  completed: "bg-green-100 text-green-800",
};

function AdminTransactionsPage() {
  const [onlineOrders, setOnlineOrders] = useState<Order[]>([]);
  const [offlineSales, setOfflineSales] = useState<OfflineSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([getOnlineOrders(), getOfflineSales()])
      .then(([online, offline]) => {
        setOnlineOrders(online.orders);
        setOfflineSales(offline.sales);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-muted-foreground">Memuat transaksi...</div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-background min-h-screen">
      <div>
        <h1 className="display text-3xl text-ink tracking-wider">Manajemen Transaksi</h1>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
          Pesanan online (Midtrans) dan penjualan offline (POS)
        </p>
      </div>

      <Tabs defaultValue="online">
        <TabsList>
          <TabsTrigger value="online">Pesanan Online</TabsTrigger>
          <TabsTrigger value="offline">Penjualan Offline / POS</TabsTrigger>
        </TabsList>

        <TabsContent value="online">
          <Card>
            <CardHeader>
              <CardTitle className="display text-sm tracking-wider text-ink">
                Pesanan Online
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream">
                    <tr>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Order ID
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Pelanggan
                      </th>
                      <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">
                        Total
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Pembayaran
                      </th>
                      <th className="p-3 text-center text-xs font-semibold tracking-wider text-ink uppercase">
                        Status
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Tanggal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {onlineOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Belum ada pesanan online
                        </td>
                      </tr>
                    ) : (
                      onlineOrders.map((order) => (
                        <tr key={order.id} className="border-t border-border">
                          <td className="p-3 font-mono text-xs text-brand-blue font-bold">
                            {order.order_id}
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-ink uppercase text-xs tracking-wide">
                              {order.customer_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {order.customer_email}
                            </p>
                          </td>
                          <td className="p-3 text-right font-bold text-ink">
                            Rp {Number(order.gross_amount).toLocaleString("id-ID")}
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {order.payment_type || "-"}
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                statusColor[order.transaction_status] ||
                                "bg-muted text-muted-foreground"
                              }`}
                            >
                              {order.transaction_status}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offline">
          <Card>
            <CardHeader>
              <CardTitle className="display text-sm tracking-wider text-ink">
                Penjualan Offline / POS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream">
                    <tr>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Sale ID
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Kasir
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Pelanggan
                      </th>
                      <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">
                        Total
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Pembayaran
                      </th>
                      <th className="p-3 text-center text-xs font-semibold tracking-wider text-ink uppercase">
                        Status
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Tanggal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {offlineSales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          Belum ada penjualan offline
                        </td>
                      </tr>
                    ) : (
                      offlineSales.map((sale) => (
                        <tr key={sale.id} className="border-t border-border">
                          <td className="p-3 font-mono text-xs text-brand-blue font-bold">
                            {sale.sale_id}
                          </td>
                          <td className="p-3 font-semibold text-ink uppercase text-xs tracking-wide">
                            {sale.cashier_name || "-"}
                          </td>
                          <td className="p-3 font-medium text-ink">
                            {sale.customer_name || "Walk-in"}
                          </td>
                          <td className="p-3 text-right font-bold text-ink">
                            Rp {Number(sale.total).toLocaleString("id-ID")}
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {sale.payment_method}
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor[sale.status] || statusColor.completed}`}
                            >
                              {sale.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {new Date(sale.created_at).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
