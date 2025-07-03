
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Call - TaskTalk',
  description: 'Voice and video calls',
};

export default function CallLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // This layout provides a clean slate for the full-screen call UI.
  return (
    <> 
      {children}
    </>
  );
}
