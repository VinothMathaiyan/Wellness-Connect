import {
  Home,
  Users,
  BarChart3,
  MessageSquare,
  Bell,
  LayoutDashboard,
  ShieldAlert,
} from 'lucide-react';
import type { ElementType } from 'react';

export interface TabConfig {
  label: string;
  icon: ElementType;
  route: string;
  matchPrefix: string;
  exact?: boolean;
  extraPrefixes?: string[];
  badgeKey?: string; // used to identify which prop supplies the badge count
}

export const navConfig: Record<'client' | 'trainer' | 'assessment', TabConfig[]> = {
  client: [
    { label: 'Home', icon: Home, route: '/client/dashboard', matchPrefix: '/client/dashboard', exact: true },
    { label: 'Trainers', icon: Users, route: '/client/trainers', matchPrefix: '/client/trainers' },
    { label: 'Progress', icon: BarChart3, route: '/client/progress', matchPrefix: '/client/progress' },
    { label: 'Messages', icon: MessageSquare, route: '/client/messages', matchPrefix: '/client/messages', badgeKey: 'unreadMessagesCount' },
    { label: 'Alerts', icon: Bell, route: '/client/alerts', matchPrefix: '/client/alerts', badgeKey: 'unreadAlertsCount' },
  ],
  trainer: [
    { label: 'Home', icon: LayoutDashboard, route: '/trainer/dashboard', matchPrefix: '/trainer/dashboard', exact: true },
    { label: 'Clients', icon: Users, route: '/trainer/clients', matchPrefix: '/trainer/client', extraPrefixes: ['/trainer/daily-summary'] },
    { label: 'Risk', icon: ShieldAlert, route: '/trainer/risk-monitor', matchPrefix: '/trainer/risk', badgeKey: 'riskAlertCount' },
    { label: 'Messages', icon: MessageSquare, route: '/trainer/messages', matchPrefix: '/trainer/messages' },
    { label: 'Alerts', icon: Bell, route: '/trainer/notifications', matchPrefix: '/trainer/notifications', badgeKey: 'notifCount' },
  ],
  assessment: [
    { label: 'Home', icon: LayoutDashboard, route: '/assessment/dashboard', matchPrefix: '/assessment/dashboard', exact: true },
    { label: 'Clients', icon: Users, route: '/assessment/clients/queue', matchPrefix: '/assessment/clients' },
    { label: 'Escalations', icon: ShieldAlert, route: '/assessment/escalations', matchPrefix: '/assessment/escalations', badgeKey: 'escalationCount' },
    { label: 'Messages', icon: MessageSquare, route: '/assessment/messages', matchPrefix: '/assessment/messages' },
    { label: 'Alerts', icon: Bell, route: '/assessment/notifications', matchPrefix: '/assessment/notifications', badgeKey: 'alertCount' },
  ],
};
