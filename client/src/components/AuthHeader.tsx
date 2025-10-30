import { Link } from 'wouter';
import { Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AuthHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm border-b border-white/10">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/welcome">
          <a className="flex items-center space-x-2 text-white hover:opacity-80 transition-opacity cursor-pointer">
            <Video className="h-6 w-6 text-blue-500" />
            <span className="text-xl font-bold">Streamline</span>
          </a>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center space-x-4">
          <Link href="/pricing">
            <a className="text-white/90 hover:text-white text-sm font-medium transition-colors cursor-pointer">
              Pricing
            </a>
          </Link>
          <Link href="/auth/login">
            <a className="text-white/90 hover:text-white text-sm font-medium transition-colors cursor-pointer">
              Login
            </a>
          </Link>
          <Link href="/auth/signup">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Sign up
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
