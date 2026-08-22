import TableOrderClient from '@/components/TableOrderClient';

export const metadata = {
  title: 'Comandă la masă | PLAY ROOM ARTICHOKE',
  description: 'Comandă direct de la masa ta.',
};

export default async function TableOrderPage({ params }) {
  const { token } = await params;
  return <TableOrderClient token={token} />;
}
