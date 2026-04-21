import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export default function ProtectedAdminRoute({ children }: Props) {
  return <>{children}</>;
}