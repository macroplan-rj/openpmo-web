import { IMilestoneDashboard, ITripleConstraintDashboard } from './IDashboard';
import { MenuItem } from 'primeng/api';
import { IWorkpackJournalInformation } from './IJournal';
import { DeliverableStatus, ProjectStatus } from '../enums/WorkpackStatusEnum';
export interface IWorkpackCardItem {
  typeCardItem: string;
  icon?: string;
  iconSvg?: boolean;
  iconColor?: string;
  nameCardItem?: string;
  fullNameCardItem?: string;
  subtitleCardItem?: any;
  statusItem?: string;
  itemId?: number;
  menuItems?: MenuItem[];
  urlCard?: string;
  paramsUrlCard?: {name: string; value: string | number}[];
  iconMenuItems?: MenuItem[];
  editPermission?: boolean;
  linked?: boolean;
  shared?: boolean;
  active?: boolean;
  canceled?: boolean;
  endManagementDate?: string;
  completed?: boolean;
  /**
   * Previsao de entrega (yyyy-MM-dd) exibida no card e na tira.
   * Nao reaproveitar subtitleCardItem: aquele carrega a data do Milestone e e reescrito
   * pelo fluxo de edicao de marco.
   */
  deliveryForecastDate?: string;
  onNewItem?;
  dashboardData?: {
    risk?: {
      high: number;
      low: number;
      medium: number;
      total: number;
    };
    milestone?: IMilestoneDashboard;
    tripleConstraint?: ITripleConstraintDashboard;
    costPerformanceIndex?: {
      costVariation: number;
      indexValue: number;
    };
    earnedValue?: number;
    schedulePerformanceIndex?: {
      indexValue: number;
      scheduleVariation: number;
    };
  };
  hasBaseline?: boolean;
  baselineName?: string;
  journalInformation?: IWorkpackJournalInformation;
  statusProperty?: ProjectStatus | DeliverableStatus;
  canUseCCB?: boolean;
}

