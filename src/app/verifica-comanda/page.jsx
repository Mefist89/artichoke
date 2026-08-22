import OrderVerificationClient from '@/components/OrderVerificationClient';

export const metadata = {
  title: 'Verifică comanda | Artichoke',
  description: 'Verificarea securizată a unei comenzi Artichoke.',
};

export default function VerifyOrderPage() {
  return <OrderVerificationClient />;
}
