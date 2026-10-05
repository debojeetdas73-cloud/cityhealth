import { useState } from "react";
import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { demoTransactionId, formatCurrency } from "@/lib/format";

export type DemoPaymentResult = { method: string; transactionId: string; status: "successful" | "failed" };

/**
 * Simulated payment only. No real gateway, no real card / UPI / bank
 * credentials are requested, transmitted or stored. Nothing is ever charged.
 */
export function DemoPaymentDialog({
  open,
  onOpenChange,
  amount,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  amount: number;
  onComplete: (result: DemoPaymentResult) => void | Promise<void>;
}) {
  const [processing, setProcessing] = useState(false);

  const pay = async (method: string, status: "successful" | "failed" = "successful") => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setProcessing(false);
    await onComplete({ method, transactionId: demoTransactionId(), status });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Demo payment — {formatCurrency(amount)}</DialogTitle>
          <DialogDescription>
            This is a simulation for demonstration only. No real money is charged and no real payment details are collected.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upi">
          <TabsList className="w-full">
            <TabsTrigger value="upi" className="flex-1"><Smartphone className="size-4" />Demo UPI</TabsTrigger>
            <TabsTrigger value="card" className="flex-1"><CreditCard className="size-4" />Demo Card</TabsTrigger>
            <TabsTrigger value="net" className="flex-1"><Banknote className="size-4" />Demo Net Banking</TabsTrigger>
          </TabsList>

          <TabsContent value="upi" className="space-y-3 pt-4">
            <Label htmlFor="demo-upi">Demo UPI handle</Label>
            <Input id="demo-upi" defaultValue="demo.patient@cityhealth" readOnly />
            <p className="text-xs text-muted-foreground">Sample handle. No PIN is ever requested.</p>
            <Button className="w-full" disabled={processing} onClick={() => void pay("Demo UPI")}>
              {processing ? "Processing…" : "Pay with Demo UPI"}
            </Button>
          </TabsContent>

          <TabsContent value="card" className="space-y-3 pt-4">
            <Label htmlFor="demo-card">Demo card</Label>
            <Input id="demo-card" defaultValue="Demo Card •••• 4242" readOnly />
            <p className="text-xs text-muted-foreground">Placeholder card. No card number, expiry or CVV is collected.</p>
            <Button className="w-full" disabled={processing} onClick={() => void pay("Demo Card")}>
              {processing ? "Processing…" : "Pay with Demo Card"}
            </Button>
          </TabsContent>

          <TabsContent value="net" className="space-y-3 pt-4">
            <Label htmlFor="demo-bank">Demo bank</Label>
            <Input id="demo-bank" defaultValue="cityhealth Demo Bank" readOnly />
            <p className="text-xs text-muted-foreground">Simulated bank. No login or password is requested.</p>
            <Button className="w-full" disabled={processing} onClick={() => void pay("Demo Net Banking")}>
              {processing ? "Processing…" : "Pay with Demo Net Banking"}
            </Button>
          </TabsContent>
        </Tabs>

        <Button variant="ghost" size="sm" disabled={processing} onClick={() => void pay("Demo UPI", "failed")}>
          Simulate a failed payment
        </Button>
      </DialogContent>
    </Dialog>
  );
}
