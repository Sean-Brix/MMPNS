import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { Menu, X, ChevronDown, Home, Info, GraduationCap, DoorOpen, Users, Phone, BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAppNavigate } from '../hooks/useAppNavigate';
import { SITE_IMAGE_DEFAULTS, readSiteImageSlots } from '../../utils/siteImageSlots';

const pathToId: Record<string, string> = {
  '/': 'home',
  '/about': 'about',
  '/academics': 'academics',
  '/admissions': 'admissions',
  '/student-life': 'student-life',
  '/news': 'news',
  '/alumni': 'alumni',
  '/alumni-gallery': 'alumni-gallery',
  '/faculty-staff': 'faculty-staff',
  '/contact': 'contact',
  '/teacher-portal': 'teacher-portal',
  '/student-portal': 'student-portal',
  '/downloadable-forms': 'downloadable-forms',
};

interface DropdownItem {
  name: string;
  id: string;
  description?: string;
}

interface NavItem {
  name: string;
  id?: string;
  dropdown?: DropdownItem[];
}

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [openDesktopDropdown, setOpenDesktopDropdown] = useState<string | null>(null);
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const location = useLocation();
  const goTo = useAppNavigate();
  const logo = readSiteImageSlots().brandLogo;

  const currentPage = pathToId[location.pathname] || '';

  const navItems: NavItem[] = [
    { name: 'Home', id: 'home' },
    { 
      name: 'About', 
      dropdown: [
        { name: 'About Us', id: 'about', description: 'Our history & mission' },
        { name: 'Faculty & Staff', id: 'faculty-staff', description: 'Meet our team' },
      ]
    },
    { 
      name: 'Academics', 
      dropdown: [
        { name: 'Programs', id: 'academics', description: 'Our curriculum' },
        { name: 'Student Life', id: 'student-life', description: 'Campus activities' },
      ]
    },
    { name: 'Admissions', id: 'admissions' },
    { 
      name: 'Portal', 
      dropdown: [
        { name: "Teacher's Portal", id: 'teacher-portal', description: 'Faculty dashboard' },
        { name: 'Student Portal', id: 'student-portal', description: 'Student dashboard' },
        { name: 'Downloadable Forms', id: 'downloadable-forms', description: 'School forms' },
      ]
    },
    { 
      name: 'Community', 
      dropdown: [
        { name: 'News & Updates', id: 'news', description: 'Latest announcements' },
        { name: 'Alumni', id: 'alumni', description: 'Alumni network' },
      ]
    },
    { name: 'Contact', id: 'contact' },
  ];

  // Quick link items (no dropdown)
  const quickLinks = navItems.filter(item => !item.dropdown);
  // Category items (with dropdown)
  const categories = navItems.filter(item => item.dropdown);

  const categoryIcons: Record<string, React.ReactNode> = {
    'About': <Info size={18} />,
    'Academics': <GraduationCap size={18} />,
    'Portal': <DoorOpen size={18} />,
    'Community': <Users size={18} />,
  };

  const quickLinkIcons: Record<string, React.ReactNode> = {
    'Home': <Home size={16} />,
    'Admissions': <BookOpen size={16} />,
    'Contact': <Phone size={16} />,
  };

  useEffect(() => {
    let frameId = 0;
    let isTicking = false;

    const handleScroll = () => {
      if (isTicking) {
        return;
      }

      isTicking = true;
      frameId = window.requestAnimationFrame(() => {
        const nextValue = window.scrollY > 20;
        setIsScrolled((currentValue) => (currentValue === nextValue ? currentValue : nextValue));
        isTicking = false;
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
      }
    };
  }, [closeTimeout]);

  const handleMouseEnter = (itemName: string) => {
    // Clear any pending close timeout
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    // Open immediately
    setOpenDesktopDropdown(itemName);
  };

  const handleMouseLeave = () => {
    // Delay closing to allow moving to dropdown
    const timeout = setTimeout(() => {
      setOpenDesktopDropdown(null);
    }, 300);
    setCloseTimeout(timeout);
  };

  const handleNavClick = (item: NavItem, e?: React.MouseEvent) => {
    if (item.dropdown) {
      e?.stopPropagation();
      setOpenDesktopDropdown(openDesktopDropdown === item.name ? null : item.name);
    } else if (item.id) {
      goTo(item.id);
      setOpenDesktopDropdown(null);
    }
  };

  const handleDropdownItemClick = (id: string) => {
    goTo(id);
    setOpenDesktopDropdown(null);
    setIsMenuOpen(false);
  };

  const isActiveItem = (item: NavItem): boolean => {
    if (item.id === currentPage) return true;
    if (item.dropdown) {
      return item.dropdown.some(dropItem => dropItem.id === currentPage);
    }
    return false;
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setExpandedCategory(null);
  }, [location.pathname]);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md' : 'bg-white/95'} ${currentPage === 'teacher-portal' || currentPage === 'student-portal' ? 'hidden' : ''}`}>
      {/* Top Utility Bar */}
      <div className="bg-[#185C20] text-white py-1.5 hidden md:block">
        <div className="container mx-auto px-4 flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.2em]">
          <div className="flex gap-6">
            <span>Madre Maria Pia Notari School</span>
            <span className="text-[#EDCD1F]">Est. 1988</span>
          </div>
          <div className="flex gap-4">
            <span className="italic">"Adore, Educate, Serve"</span>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo & School Name */}
          <div 
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => goTo('home')}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-[#EDCD1F] rounded-full blur-md opacity-0 group-hover:opacity-20 transition-opacity"></div>
              <ImageWithFallback
                src={logo}
                fallbackSrc={SITE_IMAGE_DEFAULTS.brandLogo}
                alt="MMPNS Logo"
                className="h-14 w-14 md:h-16 md:w-16 relative z-10 transition-transform group-hover:scale-105"
              />
            </div>
            <div>
              <h1 className="text-[#185C20] font-serif font-bold leading-none text-2xl md:text-3xl">MMPNS</h1>
              <p className="text-[9px] md:text-[10px] text-gray-500 font-sans font-bold uppercase tracking-widest mt-1">Madre Maria Pia Notari School</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-6 whitespace-nowrap">
            {navItems.map((item) => (
              <div 
                key={item.name || item.id} 
                className="relative"
                onMouseEnter={() => handleMouseEnter(item.name)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => item.id && goTo(item.id)}
                  className={`flex items-center gap-1 text-sm font-semibold transition-colors hover:text-[#EDCD1F] whitespace-nowrap ${
                    isActiveItem(item) ? 'text-[#185C20] border-b-2 border-[#EDCD1F]' : 'text-gray-700'
                  }`}
                >
                  {item.name}
                  {item.dropdown && <ChevronDown size={14} />}
                </button>
                {item.dropdown && openDesktopDropdown === item.name && (
                  <div className="absolute left-0 top-full mt-2 bg-white shadow-xl rounded-xl border border-[#185C20]/10 py-2 min-w-[240px] z-50">
                    {item.dropdown.map((dropItem) => (
                      <button
                        key={dropItem.id}
                        onClick={() => handleDropdownItemClick(dropItem.id)}
                        className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-[#185C20]/5 transition-colors"
                      >
                        <div className="font-semibold text-[#185C20]">{dropItem.name}</div>
                        {dropItem.description && (
                          <div className="text-xs text-gray-400 mt-0.5">{dropItem.description}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Button 
              variant="primary" 
              size="sm" 
              className="ml-2 whitespace-nowrap"
              onClick={() => goTo('admissions')}
            >
              Enroll Now
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="xl:hidden text-[#185C20] p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {isMenuOpen && (
        <div className="fixed top-[80px] md:top-[125px] right-0 bottom-0 md:bottom-auto md:left-auto md:right-6 md:w-[520px] md:max-h-[calc(100vh-160px)] bg-[#FAF9F6] z-40 xl:hidden animate-in fade-in slide-in-from-top duration-300 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] md:rounded-3xl overflow-hidden">
          <nav className="flex flex-col h-full overflow-y-auto">
            {/* Quick Links - Pill Grid */}
            <div className="px-6 md:px-8 pt-6 pb-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-3">Quick Links</p>
              <div className="flex flex-wrap gap-2">
                {quickLinks.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id) goTo(item.id);
                      setIsMenuOpen(false);
                    }}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm transition-all duration-200 ${
                      currentPage === item.id 
                        ? 'bg-[#185C20] text-white shadow-md shadow-[#185C20]/20' 
                        : 'bg-white text-gray-700 hover:bg-[#185C20]/10 hover:text-[#185C20] border border-gray-200 hover:border-[#185C20]/30'
                    }`}
                  >
                    <span className={currentPage === item.id ? 'text-[#EDCD1F]' : 'text-[#185C20]/60'}>
                      {quickLinkIcons[item.name]}
                    </span>
                    <span className="font-semibold">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-6 md:mx-8 h-px bg-gradient-to-r from-transparent via-[#185C20]/15 to-transparent" />

            {/* Category Sections */}
            <div className="px-6 md:px-8 py-4 space-y-2 flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-3">Explore</p>
              {categories.map((item) => {
                const isExpanded = expandedCategory === item.name;
                const isActive = isActiveItem(item);
                return (
                  <div key={item.name} className="group">
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : item.name)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${
                        isExpanded 
                          ? 'bg-[#185C20] text-white shadow-lg shadow-[#185C20]/20' 
                          : isActive
                            ? 'bg-[#185C20]/10 text-[#185C20]'
                            : 'bg-white text-gray-700 hover:bg-[#185C20]/5 border border-gray-100 hover:border-[#185C20]/20'
                      }`}
                    >
                      <span className={`flex items-center justify-center w-8 h-8 rounded-xl transition-colors ${
                        isExpanded 
                          ? 'bg-[#EDCD1F] text-[#185C20]' 
                          : isActive 
                            ? 'bg-[#185C20]/15 text-[#185C20]'
                            : 'bg-[#185C20]/8 text-[#185C20]/70 group-hover:bg-[#185C20]/15'
                      }`}>
                        {categoryIcons[item.name]}
                      </span>
                      <span className="flex-1 text-left font-semibold text-sm">{item.name}</span>
                      <span className={`flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                        isExpanded ? 'bg-white/20' : 'bg-transparent'
                      }`}>
                        <ChevronDown 
                          size={16} 
                          className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </span>
                    </button>
                    
                    {/* Expanded dropdown items */}
                    <div className={`overflow-hidden transition-all duration-300 ${
                      isExpanded ? 'max-h-[400px] opacity-100 mt-1.5' : 'max-h-0 opacity-0'
                    }`}>
                      <div className="pl-4 space-y-1">
                        {item.dropdown?.map((dropItem) => (
                          <button
                            key={dropItem.id}
                            onClick={() => handleDropdownItemClick(dropItem.id)}
                            className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 group/item ${
                              currentPage === dropItem.id 
                                ? 'bg-[#EDCD1F]/15 border-l-3 border-[#EDCD1F]' 
                                : 'hover:bg-white border-l-3 border-transparent hover:border-[#185C20]/20'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className={`font-semibold ${
                                currentPage === dropItem.id ? 'text-[#185C20]' : 'text-gray-700'
                              }`}>{dropItem.name}</div>
                              {dropItem.description && (
                                <div className="text-xs text-gray-400 mt-0.5">{dropItem.description}</div>
                              )}
                            </div>
                            <ArrowRight size={14} className={`transition-all ${
                              currentPage === dropItem.id 
                                ? 'text-[#185C20] opacity-100' 
                                : 'text-gray-300 opacity-0 group-hover/item:opacity-100 -translate-x-1 group-hover/item:translate-x-0'
                            }`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom CTA */}
            <div className="px-6 md:px-8 pt-2 pb-32 md:pb-6">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#185C20] to-[#1a6b24] p-5 shadow-xl shadow-[#185C20]/15">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#EDCD1F]/10 rounded-full -translate-y-8 translate-x-8" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-[#EDCD1F]/10 rounded-full translate-y-6 -translate-x-6" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-[#EDCD1F]" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#EDCD1F] font-semibold">Now Enrolling</span>
                  </div>
                  <p className="text-white/80 text-xs mb-3">Join our community of learners and achievers.</p>
                  <button
                    onClick={() => {
                      goTo('admissions');
                      setIsMenuOpen(false);
                    }}
                    className="inline-flex items-center gap-2 bg-[#EDCD1F] text-[#185C20] px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#d4b81c] transition-colors shadow-md"
                  >
                    Enroll Now
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
