import type { Metadata } from 'next';
import './globals.css';
import TopNav from '@/components/TopNav';
import { Providers } from '@/components/Providers';
import { MainWrapper } from '@/components/MainWrapper';

export const metadata: Metadata = {
  title: 'OnboardAI — AI-Powered Driver Onboarding Platform',
  description: 'Automate your entire driver onboarding pipeline with AI agents that process documents, verify identities, and manage communications.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col bg-slate-50">
            <TopNav />
            <MainWrapper>{children}</MainWrapper>
          </div>
        </Providers>
      </body>
    </html>
  );
}
