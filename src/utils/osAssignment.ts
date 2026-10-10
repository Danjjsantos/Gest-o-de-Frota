import { OSCategory, User, UserRole, UserAtribuicao, DirectedUserTarget } from '../types';

export const LEADERSHIP_ROLES: UserRole[] = [
  'Administrador',
  'Gerente',
  'Encarregado',
  'Monitor'
];

export interface CategoryAssignmentConfig {
  category: OSCategory;
  responsibleRoleLabel: string;
  matchingRoles: UserRole[];
  matchingAtribuicoes: string[];
}

export const CATEGORY_ASSIGNMENT_MAP: Record<OSCategory, CategoryAssignmentConfig> = {
  'Elétrica': {
    category: 'Elétrica',
    responsibleRoleLabel: 'Téc. Elétrica',
    matchingRoles: ['Téc. Eletrica'],
    matchingAtribuicoes: ['Elétrica'],
  },
  'Mecânica': {
    category: 'Mecânica',
    responsibleRoleLabel: 'Mecânico',
    matchingRoles: ['Mecânico'],
    matchingAtribuicoes: ['Mecânica'],
  },
  'Borracharia': {
    category: 'Borracharia',
    responsibleRoleLabel: 'Borracheiro',
    matchingRoles: ['Borracheiro'],
    matchingAtribuicoes: ['Borracharia'],
  },
  'Driox': {
    category: 'Driox',
    responsibleRoleLabel: 'Téc. Driox',
    matchingRoles: ['Téc. Driox'],
    matchingAtribuicoes: ['Driox'],
  },
  'Seva/Sacar': {
    category: 'Seva/Sacar',
    responsibleRoleLabel: 'Téc. / Monitor Seva/Sacar',
    matchingRoles: ['Monitor', 'Téc. Eletrica', 'Téc. Driox'],
    matchingAtribuicoes: ['Seva/Sacar', 'Seva/Sascar'],
  },
  'Seva/Sascar': {
    category: 'Seva/Sascar',
    responsibleRoleLabel: 'Téc. / Monitor Seva/Sascar',
    matchingRoles: ['Monitor', 'Téc. Eletrica', 'Téc. Driox'],
    matchingAtribuicoes: ['Seva/Sacar', 'Seva/Sascar'],
  },
  'Motora': {
    category: 'Motora',
    responsibleRoleLabel: 'Monitor / Téc. Motora',
    matchingRoles: ['Monitor', 'Motorista'],
    matchingAtribuicoes: ['Motora'],
  },
};

export interface AutoDirectedResult {
  category: OSCategory;
  responsibleRoleLabel: string;
  responsibleUsers: User[];
  leadershipUsers: User[];
  allDirectedUsers: User[];
  directedTargets: DirectedUserTarget[];
  primaryAssignee: User | undefined;
  summaryText: string;
}

/**
 * Computes automatic routing of Service Order based on user request:
 * "O direcionamento da OS para os usuarios cadastrados, será de forma automatica
 * ao selecionar a categoria da os, exemplo, se for selecionado Elétrica, a OS será direcionada
 * para os Téc. Elétrica cadastrados, para o gerente, encarregado, monitor e administrador.
 * Toda vez que uma ordem for aberta será desta forma, direcionado para a função responsavel
 * e para as lideranças."
 */
export function getAutoDirectedUsers(category: OSCategory, allUsers: User[]): AutoDirectedResult {
  const config = CATEGORY_ASSIGNMENT_MAP[category] || {
    category,
    responsibleRoleLabel: `Técnico ${category}`,
    matchingRoles: [],
    matchingAtribuicoes: [category],
  };

  // 1. Responsible Users (Cadastrados para esta categoria/função)
  const responsibleUsers = allUsers.filter(user => {
    // Check role match
    if (config.matchingRoles.includes(user.role)) return true;
    
    // Check atribuições match
    if (user.atribuicoes && Array.isArray(user.atribuicoes)) {
      if (user.atribuicoes.some(at => config.matchingAtribuicoes.includes(at))) {
        return true;
      }
    }
    return false;
  });

  // 2. Leadership Users (Gerente, Encarregado, Monitor, Administrador)
  const leadershipUsers = allUsers.filter(user => LEADERSHIP_ROLES.includes(user.role));

  // 3. Combined unique list
  const seenIds = new Set<string>();
  const allDirectedUsers: User[] = [];

  // Add responsible users first
  for (const user of responsibleUsers) {
    if (!seenIds.has(user.id)) {
      seenIds.add(user.id);
      allDirectedUsers.push(user);
    }
  }

  // Add leadership users next
  for (const user of leadershipUsers) {
    if (!seenIds.has(user.id)) {
      seenIds.add(user.id);
      allDirectedUsers.push(user);
    }
  }

  // Fallback if no specific technical user is registered
  let primaryAssignee: User | undefined = responsibleUsers[0];
  if (!primaryAssignee) {
    // Pick first encarregado or administrador
    primaryAssignee = leadershipUsers.find(u => u.role === 'Encarregado' || u.role === 'Administrador') || allUsers[0];
  }

  // Structured targets for saving in the OS
  const directedTargets: DirectedUserTarget[] = allDirectedUsers.map(user => ({
    userId: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    targetType: responsibleUsers.some(ru => ru.id === user.id) ? 'responsavel' : 'lideranca'
  }));

  // Readable summary text
  const respNames = responsibleUsers.length > 0 
    ? responsibleUsers.map(u => `${u.name} (${u.role})`).join(', ')
    : `${config.responsibleRoleLabel} (a cadastrar)`;

  const leadRolesPresent = Array.from(new Set(leadershipUsers.map(u => u.role))).join(', ');
  const summaryText = `Função Responsável: ${respNames} | Lideranças: ${leadRolesPresent || 'Gerente, Encarregado, Monitor, Administrador'}`;

  return {
    category,
    responsibleRoleLabel: config.responsibleRoleLabel,
    responsibleUsers,
    leadershipUsers,
    allDirectedUsers,
    directedTargets,
    primaryAssignee,
    summaryText
  };
}
