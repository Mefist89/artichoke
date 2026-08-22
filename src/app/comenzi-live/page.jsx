import LiveOrderBoard from '@/components/LiveOrderBoard';

export const metadata = {
  title: 'Comenzi live | Artichoke',
  description: 'Ecranul live pentru urmărirea comenzilor Artichoke.',
};

export default function LiveOrdersPage() {
  return <LiveOrderBoard />;
}
