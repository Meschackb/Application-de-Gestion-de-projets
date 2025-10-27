// script.js

// 1. Initialisation, Classes et Données de Base


const STORAGE_KEY = 'pms_data';
const USERS_STORAGE_KEY = 'pms_users'; 
let currentProject = null;
let loggedInUser = null;

// Définition initiale des Rôles (utilisée si le localStorage des utilisateurs est vide)
const INITIAL_USERS = [
    { id: 1, name: 'Admin User', username: 'admin', password: 'admin', role: 'admin' },
    { id: 2, name: 'Membre Alpha', username: 'membre', password: 'membre', role: 'member' },
    { id: 3, name: 'Développeur Beta', username: 'dev_beta', password: 'dev', role: 'member' },
];

const TASK_STATUSES = {
    TODO: { key: 'todo', name: 'À faire', color: 'var(--color-info)' },
    IN_PROGRESS: { key: 'in_progress', name: 'En cours', color: 'var(--color-warning)' },
    REVIEW: { key: 'review', name: 'En revue', color: 'var(--color-secondary)' },
    DONE: { key: 'done', name: 'Terminé', color: 'var(--color-success)' },
};

// Classes pour la structure des données
class Task {
    constructor(text, assigneeId, projectId, startDate, endDate) {
        this.id = Date.now().toString() + Math.random().toString().slice(2, 5);
        this.text = text;
        this.assigneeId = assigneeId;
        this.projectId = projectId;
        this.status = TASK_STATUSES.TODO.key;
        this.startDate = startDate; 
        this.endDate = endDate; 
    }
}

class Project {
    constructor(name, description, managerId) {
        this.id = Date.now().toString();
        this.name = name;
        this.description = description;
        this.managerId = managerId;
        this.tasks = []; 
        
        this.creatorName = loggedInUser ? loggedInUser.name : 'Système';
        this.createdAt = new Date().toLocaleString('fr-FR');
    }

    getProgress() {
        if (this.tasks.length === 0) return 0;
        const completedTasks = this.tasks.filter(t => t.status === TASK_STATUSES.DONE.key).length;
        return Math.round((completedTasks / this.tasks.length) * 100);
    }
}


// 2. Gestion du DOM et des Vues


const getElement = id => document.getElementById(id);

const views = {
    auth: getElement('auth-view'),
    dashboard: getElement('dashboard-view'),
    projectForm: getElement('project-form-view'),
    projectList: getElement('project-list-view'),
    projectDetail: getElement('project-detail-view'),
    about: getElement('about-view'),
    teamManagement: getElement('team-management-view'), 
};

const showView = (viewName) => {
    Object.values(views).forEach(view => {
        if (view) view.style.display = 'none';
    });
    if (views[viewName]) {
        views[viewName].style.display = (viewName === 'auth') ? 'flex' : 'block';
    }
};


// 3. Gestion des Données (localStorage)


/** Récupère les données des projets du localStorage. */
const getProjectData = () => {
    const dataJson = localStorage.getItem(STORAGE_KEY);
    const data = dataJson ? JSON.parse(dataJson) : { projects: [] };
    
    // Assurer que les objets sont des instances de Project
    data.projects = data.projects.map(p => {
        Object.setPrototypeOf(p, Project.prototype);
        return p;
    });

    return data;
};

/** Sauvegarde les projets dans le localStorage. */
const saveProjectData = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

/** Gère la récupération et l'initialisation des utilisateurs. */
const getUsers = () => {
    const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
    let users = usersJson ? JSON.parse(usersJson) : [];
    
    // Initialiser avec les utilisateurs de base si la liste est vide
    if (users.length === 0) {
        users = INITIAL_USERS;
        saveUsers(users); 
    }
    return users;
};

/** Sauvegarde les utilisateurs dans le localStorage. */
const saveUsers = (users) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};


// 4. Fonctions d'Authentification et de Rôle


const login = (username, password) => {
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        loggedInUser = user;
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userId', user.id);
        
        getElement('app-container').style.display = 'block';
        getElement('user-info').innerHTML = `Connecté en tant que: **${user.name}** (<span id="user-role">${user.role.toUpperCase()}</span>)`;
        
        getElement('show-team-management-btn').style.display = isAdmin() ? 'block' : 'none';

        updateDashboard();
        return true;
    }
    return false;
};

const logout = () => {
    if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userId');
        loggedInUser = null;
        getElement('app-container').style.display = 'none';
        showView('auth');
    }
};

const checkAuth = () => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const userId = parseInt(localStorage.getItem('userId'));

    if (isAuthenticated && userId) {
        const users = getUsers();
        loggedInUser = users.find(u => u.id === userId);
        if (loggedInUser) {
            // Re-simuler le login pour mettre à jour l'UI et les boutons
            login(loggedInUser.username, loggedInUser.password); 
            return true;
        }
    }
    return false;
};

const isAdmin = () => loggedInUser && loggedInUser.role === 'admin';



// 5. Gestion des Vues (Dashboard, Projets, Détails)


/** Met à jour le tableau de bord avec les KPI globaux. */
const updateDashboard = () => {
    const data = getProjectData();
    const allTasks = data.projects.flatMap(p => p.tasks);
    
    getElement('total-projects-count').textContent = data.projects.length;
    getElement('active-tasks-count').textContent = allTasks.filter(t => t.status !== TASK_STATUSES.DONE.key).length;
    getElement('completed-tasks-count').textContent = allTasks.filter(t => t.status === TASK_STATUSES.DONE.key).length;

    const totalProgress = data.projects.reduce((sum, p) => sum + p.getProgress(), 0);
    const averageProgress = data.projects.length > 0 ? Math.round(totalProgress / data.projects.length) : 0;
    getElement('average-progress').textContent = `${averageProgress}%`;

    getElement('show-add-project-btn').style.display = isAdmin() ? 'block' : 'none';

    showView('dashboard');
};

/** Affiche la liste des projets. */
const renderProjectList = () => {
    const data = getProjectData();
    const users = getUsers();
    const listContainer = getElement('project-list');
    listContainer.innerHTML = '';
    
    data.projects.forEach(project => {
        const canEdit = isAdmin() || (loggedInUser && loggedInUser.id === project.managerId);
        
        const manager = users.find(u => u.id === project.managerId);
        const managerName = manager ? manager.name : 'Inconnu';
        const progress = project.getProgress();
        
        const creatorName = project.creatorName || 'N/A';
        const createdAt = project.createdAt || 'N/A';

        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <h3>${project.name}</h3>
            <p>Manager: ${managerName}</p>
            <p>Porteur: ${creatorName}</p>
            <p style="font-size:0.8em; color:#999;">Créé le: ${createdAt}</p>
            <p>${project.description.substring(0, 100)}...</p>
            <div class="progress-info">Progression: <span class="progress-percent">${progress}%</span></div>
            <progress value="${progress}" max="100"></progress>
            <div class="project-actions" style="margin-top:15px;">
                <button class="btn btn-primary btn-small view-project-btn" data-id="${project.id}"><i class="fas fa-eye"></i> Détails</button>
                ${canEdit ? `<button class="btn btn-secondary btn-small edit-project-btn" data-id="${project.id}"><i class="fas fa-edit"></i> Modifier</button>` : ''}
                ${isAdmin() ? `<button class="btn btn-danger btn-small delete-project-btn" data-id="${project.id}"><i class="fas fa-trash-alt"></i> Supprimer</button>` : ''}
            </div>
        `;

        listContainer.appendChild(card);
    });

    listContainer.querySelectorAll('.view-project-btn').forEach(btn => btn.addEventListener('click', (e) => showProjectDetails(e.target.dataset.id)));
    if (isAdmin()) {
        listContainer.querySelectorAll('.edit-project-btn').forEach(btn => btn.addEventListener('click', (e) => editProject(e.target.dataset.id)));
        listContainer.querySelectorAll('.delete-project-btn').forEach(btn => btn.addEventListener('click', (e) => deleteProject(e.target.dataset.id)));
    }

    showView('projectList');
};

/** Affiche les détails d'un projet et le tableau Kanban. */
const showProjectDetails = (projectId) => {
    const data = getProjectData();
    const project = data.projects.find(p => p.id === projectId);

    if (!project) return alert("Projet introuvable.");

    currentProject = project;

    // Mettre à jour les informations du projet
    getElement('detail-project-name').textContent = project.name;
    const progress = project.getProgress();
    getElement('detail-progress-percent').textContent = `${progress}%`;
    getElement('detail-progress-bar').value = progress;
    
    // Préparer les options d'assignation
    const users = getUsers();
    const assigneeSelect = getElement('new-task-assignee');
    assigneeSelect.innerHTML = '<option value="" disabled selected>Assigner à...</option>';
    // Inclure tous les utilisateurs, qu'ils soient admin ou member
    users.forEach(user => { 
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        assigneeSelect.appendChild(option);
    });
    
    // Afficher la gestion des tâches
    renderTaskColumns(project);
    showView('projectDetail');
};

/** Gère la création/modification d'un projet. */
const handleProjectForm = (e) => {
    e.preventDefault();
    
    const projectId = getElement('project-id').value;
    const name = getElement('project-name').value.trim();
    const description = getElement('project-description').value.trim();
    const managerId = parseInt(getElement('project-manager').value);

    let data = getProjectData();

    if (projectId) {
        // Modification
        const projectIndex = data.projects.findIndex(p => p.id === projectId);
        if (projectIndex !== -1) {
            data.projects[projectIndex].name = name;
            data.projects[projectIndex].description = description;
            data.projects[projectIndex].managerId = managerId;
        }
    } else {
        // Ajout
        const newProject = new Project(name, description, managerId);
        data.projects.push(newProject);
    }
    
    saveProjectData(data);
    getElement('project-form').reset();
    renderProjectList();
};

/** Prépare le formulaire pour l'ajout ou la modification de projet. */
const setupProjectForm = (projectId = null) => {
    const managerSelect = getElement('project-manager');
    const users = getUsers();
    
    // Afficher tous les utilisateurs pouvant être managers
    managerSelect.innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');

    if (projectId) {
        editProject(projectId);
    } else {
        getElement('project-form-title').textContent = "Ajouter un Projet";
        getElement('project-id').value = '';
        getElement('project-form').reset();
        showView('projectForm');
    }
}



// 6. Logique de Gestion des Tâches (Kanban)

/** Rend le tableau Kanban des tâches pour le projet actuel. */
const renderTaskColumns = (project) => {
    const taskColumnsContainer = getElement('task-columns');
    taskColumnsContainer.innerHTML = '';
    
    const columns = [
        { key: TASK_STATUSES.TODO.key, name: TASK_STATUSES.TODO.name, className: 'column-todo' },
        { key: TASK_STATUSES.IN_PROGRESS.key, name: TASK_STATUSES.IN_PROGRESS.name, className: 'column-in-progress' },
        { key: TASK_STATUSES.REVIEW.key, name: TASK_STATUSES.REVIEW.name, className: 'column-review' },
        { key: TASK_STATUSES.DONE.key, name: TASK_STATUSES.DONE.name, className: 'column-done' },
    ];

    columns.forEach(col => {
        const columnDiv = document.createElement('div');
        columnDiv.className = `task-column ${col.className}`;
        columnDiv.innerHTML = `<h4>${col.name}</h4><div id="tasks-${col.key}"></div>`;
        taskColumnsContainer.appendChild(columnDiv);

        const taskContainer = getElement(`tasks-${col.key}`);
        const tasksInColumn = project.tasks.filter(t => t.status === col.key);

        tasksInColumn.forEach(task => {
            taskContainer.appendChild(createTaskCard(task, project.id));
        });
    });
};

/** Crée la carte HTML d'une tâche. */
const createTaskCard = (task, projectId) => {
    const users = getUsers();
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.taskId = task.id;

    const assignee = users.find(u => u.id === task.assigneeId);
    const assigneeName = assignee ? assignee.name : 'Non Assigné';
    
    let actionButtons = '';
    if (task.status === TASK_STATUSES.TODO.key) {
        actionButtons = `<button class="btn-change-status" data-status="${TASK_STATUSES.IN_PROGRESS.key}"><i class="fas fa-play"></i> Démarrer</button>`;
    } else if (task.status === TASK_STATUSES.IN_PROGRESS.key) {
        actionButtons = `<button class="btn-change-status" data-status="${TASK_STATUSES.REVIEW.key}"><i class="fas fa-check"></i> Terminer</button>`;
    } else if (task.status === TASK_STATUSES.REVIEW.key) {
        actionButtons = `<button class="btn-change-status" data-status="${TASK_STATUSES.DONE.key}"><i class="fas fa-clipboard-check"></i> Approuver</button>`;
    }

    const formattedStartDate = task.startDate ? new Date(task.startDate).toLocaleDateString('fr-FR') : 'N/A';
    const formattedEndDate = task.endDate ? new Date(task.endDate).toLocaleDateString('fr-FR') : 'N/A';
    
    card.innerHTML = `
        <h5>${task.text}</h5>
        <span class="assignee"><i class="fas fa-user"></i> ${assigneeName}</span>
        <div class="date-info">
            Début: <strong>${formattedStartDate}</strong> | Fin: <strong>${formattedEndDate}</strong>
        </div>
        <div class="status-actions">
            ${actionButtons}
            <button class="delete-task-btn" data-id="${task.id}" data-project-id="${projectId}"><i class="fas fa-trash-alt"></i></button>
        </div>
    `;

    card.querySelector('.delete-task-btn').addEventListener('click', () => deleteTask(task.id, projectId));
    const changeStatusBtn = card.querySelector('.btn-change-status');
    if (changeStatusBtn) {
        changeStatusBtn.addEventListener('click', (e) => changeTaskStatus(task.id, projectId, e.target.dataset.status));
    }
    
    return card;
};

/** Ajoute une tâche au projet actuel. */
const addTaskToProject = () => {
    const text = getElement('new-task-text').value.trim();
    const assigneeId = parseInt(getElement('new-task-assignee').value);
    const startDate = getElement('new-task-start-date').value; 
    const endDate = getElement('new-task-end-date').value;

    if (!text || isNaN(assigneeId) || !currentProject || !startDate || !endDate) {
        alert("Veuillez entrer le texte, assigner un membre, et spécifier les dates de début et de fin.");
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        alert("La date de fin ne peut pas être antérieure à la date de début.");
        return;
    }
    
    const newTask = new Task(text, assigneeId, currentProject.id, startDate, endDate);
    
    let data = getProjectData();
    const project = data.projects.find(p => p.id === currentProject.id);
    if (project) {
        project.tasks.push(newTask);
        saveProjectData(data);
        
        currentProject = project;
        getElement('new-task-text').value = '';
        getElement('new-task-assignee').value = '';
        getElement('new-task-start-date').value = '';
        getElement('new-task-end-date').value = '';
        
        showProjectDetails(currentProject.id);
    }
};

/** Change le statut d'une tâche. */
const changeTaskStatus = (taskId, projectId, newStatus) => {
    let data = getProjectData();
    const project = data.projects.find(p => p.id === projectId);

    if (project) {
        const task = project.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            saveProjectData(data);
            currentProject = project;
            showProjectDetails(projectId);
        }
    }
};

/** Supprime une tâche. */
const deleteTask = (taskId, projectId) => {
    if (!confirm("Confirmer la suppression de cette tâche ?")) return;

    let data = getProjectData();
    const project = data.projects.find(p => p.id === projectId);

    if (project) {
        project.tasks = project.tasks.filter(t => t.id !== taskId);
        saveProjectData(data);
        currentProject = project;
        showProjectDetails(projectId);
    }
};


// 7. Logique de Gestion de l'Équipe (Vue 6)


/** Affiche la vue de gestion d'équipe et la liste des membres. */
const renderTeamManagement = () => {
    if (!isAdmin()) {
        alert("Accès refusé. Seul l'administrateur peut gérer l'équipe.");
        updateDashboard();
        return;
    }
    
    renderMemberList();
    // Réinitialiser le formulaire
    getElement('team-member-form').reset();
    getElement('member-id').value = '';
    getElement('save-member-btn').innerHTML = `<i class="fas fa-save"></i> Enregistrer Membre`;
    getElement('member-password').placeholder = "";
    
    showView('teamManagement');
};

/** Rend la liste des membres d'équipe. */
const renderMemberList = () => {
    const users = getUsers();
    const listContainer = getElement('team-member-list');
    listContainer.innerHTML = '';
    
    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'team-member-card';
        card.innerHTML = `
            <div class="member-info">
                <p><strong>${user.name}</strong> (@${user.username})</p>
                <span class="member-role role-${user.role}">${user.role.toUpperCase()}</span>
            </div>
            <div class="member-actions">
                <button class="btn btn-info btn-small edit-member-btn" data-id="${user.id}"><i class="fas fa-edit"></i> Modifier</button>
                <button class="btn btn-danger btn-small delete-member-btn" data-id="${user.id}" ${user.id === loggedInUser.id ? 'disabled' : ''}><i class="fas fa-trash-alt"></i> Supprimer</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
    
    listContainer.querySelectorAll('.edit-member-btn').forEach(btn => btn.addEventListener('click', (e) => editMember(parseInt(e.target.dataset.id))));
    listContainer.querySelectorAll('.delete-member-btn').forEach(btn => btn.addEventListener('click', (e) => deleteMember(parseInt(e.target.dataset.id))));
};

/** Prépare le formulaire pour l'édition d'un membre. */
const editMember = (memberId) => {
    const users = getUsers();
    const user = users.find(u => u.id === memberId);
    if (!user) return;
    
    getElement('member-id').value = user.id;
    getElement('member-name').value = user.name;
    getElement('member-role').value = user.role;
    getElement('member-username').value = user.username;
    getElement('member-password').value = ''; 
    getElement('member-password').placeholder = "Laisser vide pour ne pas changer";

    getElement('save-member-btn').innerHTML = `<i class="fas fa-sync-alt"></i> Mettre à Jour`;
};

/** Gère l'ajout/modification d'un membre. */
const handleMemberForm = (e) => {
    e.preventDefault();
    
    const id = getElement('member-id').value ? parseInt(getElement('member-id').value) : null;
    const name = getElement('member-name').value.trim();
    const role = getElement('member-role').value;
    const username = getElement('member-username').value.trim();
    const password = getElement('member-password').value; 
    
    let users = getUsers();
    
    if (id) {
        // Modification
        const userIndex = users.findIndex(u => u.id === id);
        if (userIndex !== -1) {
            if (users.some(u => u.username === username && u.id !== id)) {
                alert("Cet identifiant est déjà utilisé par un autre membre.");
                return;
            }
            users[userIndex].name = name;
            users[userIndex].role = role;
            users[userIndex].username = username;
            if (password) {
                users[userIndex].password = password; 
            }
        }
    } else {
        // Ajout
        if (users.some(u => u.username === username)) {
            alert("Cet identifiant est déjà utilisé.");
            return;
        }
        if (!password) {
             alert("Le mot de passe est obligatoire pour l'ajout d'un nouveau membre.");
             return;
        }

        const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
        users.push({
            id: newId,
            name,
            username,
            password,
            role
        });
    }
    
    saveUsers(users);
    // Si l'utilisateur actuel a été modifié (rôle/nom), mettre à jour l'affichage
    if (id === loggedInUser.id) {
         loggedInUser = users.find(u => u.id === loggedInUser.id);
    }
    
    renderTeamManagement(); 
};

/** Supprime un membre. */
const deleteMember = (memberId) => {
    if (memberId === loggedInUser.id) {
        alert("Vous ne pouvez pas vous supprimer vous-même.");
        return;
    }
    if (!confirm("Voulez-vous vraiment supprimer ce membre ?")) return;
    
    let data = getProjectData();
    let users = getUsers();
    
    // Vérifier si le membre est assigné à des tâches ou des projets (non implémenté, mais bonne pratique)
    
    users = users.filter(u => u.id !== memberId);
    saveUsers(users);
    
    // Recharger les projets pour s'assurer que si un manager est supprimé, cela se voit dans la liste
    // Pour une application réelle, il faudrait réassigner ou supprimer les tâches et projets liés.
    
    renderTeamManagement();
};


// 8. Initialisation et Écouteurs d'Événements

// Fonctions d'édition et de suppression de projet
const editProject = (projectId) => {
    if (!isAdmin()) return;
    const data = getProjectData();
    const project = data.projects.find(p => p.id === projectId);
    const users = getUsers();
    
    if (project) {
        getElement('project-form-title').textContent = "Modifier le Projet";
        getElement('project-id').value = project.id;
        getElement('project-name').value = project.name;
        getElement('project-description').value = project.description;
        
        const managerSelect = getElement('project-manager');
        managerSelect.innerHTML = users.map(u => `<option value="${u.id}" ${u.id === project.managerId ? 'selected' : ''}>${u.name}</option>`).join('');
        
        showView('projectForm');
    }
};

const deleteProject = (projectId) => {
    if (!isAdmin()) return;
    if (!confirm("ATTENTION : Supprimer ce projet supprimera toutes ses tâches. Continuer ?")) return;

    let data = getProjectData();
    data.projects = data.projects.filter(p => p.id !== projectId);
    saveProjectData(data);
    renderProjectList();
};


// Écouteurs d'événements principaux
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialisation de la vue
    if (!checkAuth()) {
        showView('auth');
    }

    // 2. Événements d'authentification
    getElement('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = getElement('username').value;
        const password = getElement('password').value;
        const errorDiv = getElement('login-error');
        
        if (!login(username, password)) {
            errorDiv.textContent = "Nom d'utilisateur ou mot de passe incorrect.";
            errorDiv.style.display = 'block';
        } else {
            errorDiv.style.display = 'none';
        }
    });
    getElement('logout-btn').addEventListener('click', logout);

    // 3. Événements de navigation
    getElement('show-add-project-btn').addEventListener('click', () => setupProjectForm());
    getElement('show-project-list-btn').addEventListener('click', renderProjectList);
    getElement('cancel-project-form-btn').addEventListener('click', renderProjectList);
    getElement('back-to-list-btn').addEventListener('click', renderProjectList);
    
    getElement('show-about-btn').addEventListener('click', () => showView('about'));
    getElement('back-from-about-btn').addEventListener('click', updateDashboard);
    
    // Nouveaux événements pour la gestion d'équipe
    getElement('show-team-management-btn').addEventListener('click', renderTeamManagement);
    getElement('cancel-member-edit-btn').addEventListener('click', updateDashboard); // Annuler retourne au dashboard

    // 4. Événements de gestion de projet/tâche
    getElement('project-form').addEventListener('submit', handleProjectForm);
    getElement('add-task-to-project-btn').addEventListener('click', addTaskToProject);
    
    // 5. Événements de gestion des membres
    getElement('team-member-form').addEventListener('submit', handleMemberForm);
});
