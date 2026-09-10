import {IFile} from './IFile';
import { IOrganization } from './IOrganization';

export interface IPersonRole {
  role: string;
  workLocation?: string;
}

/**
 * Formato em que os papeis chegam da API.
 *
 * `GET /persons/{key}` responde `PersonGetByIdDto.roles` como `List<String>`
 * (ex.: `["citizen"]`), enquanto `CitizenDto` e `ccbmembers/PersonResponse`
 * respondem `RoleResource` (`{ role, workLocation }`). Quem consome papeis de
 * pessoa precisa normalizar antes de usar.
 */
export type IPersonRoleResponse = IPersonRole | string;

export interface IPerson {
  id?: number;
  name: string;
  fullName?: string;
  email?: string;
  key?: string;
  guid?: string;
  contactEmail?: string;
  phoneNumber?: string;
  address?: string;
  cpf?: string;
  isUser?: boolean;
  officePermission?: IPersonOfficePermission;
  roles?: IPersonRole[];
  administrator?: boolean;
  avatar?: IFile;
  isCcbMember?: boolean;
  workLocal?: IWorkLocal;
  organization?: IOrganization;
  idOrganization?: number;
}

export interface IWorkLocal {
  idOffice: number;
  idPlan: number;
  idWorkpack: number;
  idWorkpackModelLinked: number;
}

export interface IPersonOfficePermission {
  id: number;
  accessLevel: string;
  planPermissions: IPersonPlanPermission[];
}

export interface IPersonPlanPermission {
  id: number;
  name: string;
  accessLevel: string;
  workpacksPermission: IPersonWorkpackPermission[];
}

export interface IPersonWorkpackPermission {
  id: number;
  name: string;
  accessLevel: string;
  roles: string[];
  icon: string;
  ccbMember?: boolean;
}
