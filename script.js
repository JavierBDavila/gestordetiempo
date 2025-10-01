// =============================
// Variables globales
// =============================
let activities = [];
let currentActivityIndex = -1;
let reminderInterval = null;
let remainingTime = 0;
let inactivityInterval = null;
let notificationPermission = false;

// =============================
// Elementos del DOM
// =============================
const startTimeInput = document.getElementById('start-time');
const endTimeInput = document.getElementById('end-time');
const calculateBtn = document.getElementById('calculate-btn');
const freeTimeResult = document.getElementById('free-time-result');
const activitySelect = document.getElementById('activity');
const hoursInput = document.getElementById('hours');
const prioritySelect = document.getElementById('priority');
const addActivityBtn = document.getElementById('add-activity-btn');
const activitiesBody = document.getElementById('activities-body');
const startReminderBtn = document.getElementById('start-reminder-btn');
const completeActivityBtn = document.getElementById('complete-activity-btn');
const currentActivityDiv = document.getElementById('current-activity');
const notificationArea = document.getElementById('notification-area');

// =============================
// Event Listeners
// =============================
document.addEventListener('DOMContentLoaded', function() {
    calculateBtn.addEventListener('click', calculateFreeTime);
    addActivityBtn.addEventListener('click', addActivity);
    startReminderBtn.addEventListener('click', startReminder);
    completeActivityBtn.addEventListener('click', completeActivity);

    // Establecer valor por defecto para actividades
    hoursInput.value = "01:00";

    // Solicitar permiso para notificaciones al cargar
    requestNotificationPermission();

    // Iniciar verificación de inactividad
    startInactivityCheck();
});

// =============================
// Manejo de notificaciones
// =============================
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.warn("Este navegador no soporta notificaciones");
        showNotificationInternal("Tu navegador no soporta notificaciones", "info");
        return;
    }

    if (Notification.permission === "granted") {
        notificationPermission = true;
        showNotificationInternal("✅ Notificaciones habilitadas correctamente", "success");
        return;
    }

    if (Notification.permission === "denied") {
        showNotificationInternal("⚠️ Has bloqueado las notificaciones. Actívalas en la configuración del navegador.", "info");
        return;
    }

    // Pedir permiso activamente
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            notificationPermission = true;
            showNotificationInternal("✅ Notificaciones habilitadas correctamente", "success");
        } else {
            notificationPermission = false;
            showNotificationInternal("⚠️ No se concedieron permisos de notificación.", "info");
        }
    }).catch(err => {
        console.error("Error solicitando permiso de notificaciones:", err);
    });
}

function showBrowserNotification(title, message) {
    if (!("Notification" in window)) return;
    if (!notificationPermission) return;

    try {
        const notification = new Notification(title, {
            body: message,
            icon: '/favicon.ico',
            tag: 'study-manager'
        });

        setTimeout(() => notification.close(), 5000);

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } catch (e) {
        console.error("Error mostrando la notificación:", e);
    }
}

// =============================
// Inactividad
// =============================
function startInactivityCheck() {
    if (inactivityInterval) clearInterval(inactivityInterval);
    inactivityInterval = setInterval(checkInactivity, 30000); // cada 30 seg
}

function checkInactivity() {
    const pendingActivities = activities.filter(activity => activity.status === 'pendiente');
    if (pendingActivities.length > 0 && currentActivityIndex === -1) {
        const message = `Tienes ${pendingActivities.length} actividad(es) pendiente(s). ¡Inicia una para ser más productivo!`;
        showNotificationInternal(message, "info");
        showBrowserNotification("Actividades Pendientes", message);
    }
}

// Calcular horas libres (considerando 24 horas del día)
function calculateFreeTime() {
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    
    if (!startTime || !endTime) {
        showNotificationInternal('Por favor, ingresa tanto la hora de inicio como la de fin.', 'info');
        return;
    }
    
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    
    if (end <= start) {
        showNotificationInternal('La hora de fin debe ser posterior a la hora de inicio.', 'info');
        return;
    }
    
    // Calcular horas de clases
    const classMinutes = end - start;
    const classHours = Math.floor(classMinutes / 60);
    const classMins = classMinutes % 60;
    
    // Calcular horas libres (24 horas - 8 horas sueño - horas de clases)
    const totalDayMinutes = 24 * 60; // 24 horas en minutos
    const sleepMinutes = 8 * 60; // 8 horas de sueño
    const freeMinutes = totalDayMinutes - sleepMinutes - classMinutes;
    
    if (freeMinutes <= 0) {
        freeTimeResult.innerHTML = `
            <p><strong>Horas de clases:</strong> ${classHours}h ${classMins}m</p>
            <p><strong>Horas libres disponibles:</strong> 0h 0m</p>
            <p>¡Atención! Después de considerar 8 horas de sueño y tu horario de clases, no te quedan horas libres.</p>
            <p>Revisa tu horario de clases.</p>
        `;
        addActivityBtn.disabled = true;
        return;
    }
    
    const freeHours = Math.floor(freeMinutes / 60);
    const freeMins = freeMinutes % 60;
    
    freeTimeResult.innerHTML = `
        <p><strong>Horas de clases:</strong> ${classHours}h ${classMins}m</p>
        <p><strong>Horas libres disponibles:</strong> ${freeHours}h ${freeMins}m</p>
        <p><em>Nota: Se han reservado 8 horas para sueño (24h - 8h sueño - ${classHours}h${classMins}m clases)</em></p>
        <p>Ahora puedes asignar estas horas a tus actividades.</p>
    `;
    
    // Habilitar el botón de agregar actividades
    addActivityBtn.disabled = false;
    
    // Notificación del navegador
    showBrowserNotification(
        "Horas Libres Calculadas", 
        `Tienes ${freeHours}h ${freeMins}m libres para actividades`
    );
}

// Validar formato de horas para actividades (hh:mm)
function validateTimeFormat(time) {
    const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
}

// Convertir tiempo en formato hh:mm a minutos
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// Convertir minutos a formato hh:mm
function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Agregar una nueva actividad
function addActivity() {
    const activity = activitySelect.value;
    const hours = hoursInput.value;
    const priority = prioritySelect.value;
    
    if (!hours) {
        showNotificationInternal('Por favor, ingresa la duración de la actividad.', 'info');
        return;
    }
    
    // Validar formato de horas
    if (!validateTimeFormat(hours)) {
        showNotificationInternal('Por favor, ingresa el tiempo en formato hh:mm (ej: 01:30).', 'info');
        return;
    }
    
    // Verificar que no se exceda el tiempo disponible
    const totalAssignedMinutes = activities.reduce((total, act) => {
        return total + timeToMinutes(act.hours);
    }, 0);
    
    const newActivityMinutes = timeToMinutes(hours);
    const freeMinutes = calculateTotalFreeMinutes();
    
    if (totalAssignedMinutes + newActivityMinutes > freeMinutes) {
        const freeHours = Math.floor(freeMinutes / 60);
        const freeMins = freeMinutes % 60;
        showNotificationInternal(`No tienes suficiente tiempo libre. Dispones de ${freeHours}h ${freeMins}m libres.`, 'info');
        return;
    }
    
    const newActivity = {
        id: Date.now(),
        name: activity,
        displayName: getActivityDisplayName(activity),
        hours: hours,
        priority: priority,
        status: 'pendiente',
        completedHours: '00:00'
    };
    
    activities.push(newActivity);
    renderActivitiesTable();
    
    // Limpiar formulario pero mantener un valor por defecto
    hoursInput.value = "01:00";
    
    // Habilitar el botón de iniciar recordatorio si hay actividades
    if (activities.length > 0) {
        startReminderBtn.disabled = false;
    }
    
    const message = `Actividad "${getActivityDisplayName(activity)}" agregada correctamente.`;
    showNotificationInternal(message, 'success');
    showBrowserNotification("Actividad Agregada", message);
}

// Obtener nombre legible de la actividad
function getActivityDisplayName(activity) {
    const names = {
        'estudio': 'Estudio',
        'juegos': 'Juegos',
        'deporte': 'Deporte',
        'convivencia': 'Convivencia'
    };
    return names[activity] || activity;
}

// Renderizar la tabla de actividades
function renderActivitiesTable() {
    activitiesBody.innerHTML = '';
    
    if (activities.length === 0) {
        activitiesBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center;">No hay actividades agregadas</td>
            </tr>
        `;
        return;
    }
    
    // Ordenar actividades por prioridad
    const priorityOrder = {
        'muy-alta': 4,
        'alta': 3,
        'media': 2,
        'baja': 1
    };
    
    activities.sort((a, b) => {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    activities.forEach(activity => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${activity.displayName}</td>
            <td>${activity.hours}</td>
            <td><span class="status-badge status-${activity.status}">${activity.status === 'pendiente' ? 'Pendiente' : 'Completada'}</span></td>
            <td><span class="priority-badge priority-${activity.priority}">${getPriorityDisplayName(activity.priority)}</span></td>
            <td>
                <button class="btn btn-warning" onclick="deleteActivity(${activity.id})">Eliminar</button>
            </td>
        `;
        
        activitiesBody.appendChild(row);
    });
}

// Obtener nombre legible de la prioridad
function getPriorityDisplayName(priority) {
    const names = {
        'muy-alta': 'Muy Alta',
        'alta': 'Alta',
        'media': 'Media',
        'baja': 'Baja'
    };
    return names[priority] || priority;
}

// Eliminar actividad
function deleteActivity(id) {
    activities = activities.filter(activity => activity.id !== id);
    renderActivitiesTable();
    
    // Si se eliminó la actividad actual, reiniciar
    if (currentActivityIndex >= 0 && activities[currentActivityIndex] && activities[currentActivityIndex].id === id) {
        stopReminder();
        currentActivityIndex = -1;
        updateCurrentActivityDisplay();
    }
    
    // Deshabilitar botones si no hay actividades
    if (activities.length === 0) {
        startReminderBtn.disabled = true;
        completeActivityBtn.disabled = true;
    }
    
    showNotificationInternal("Actividad eliminada correctamente", "info");
}

// Calcular minutos libres totales (24h - 8h sueño - horas de clases)
function calculateTotalFreeMinutes() {
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    
    if (!startTime || !endTime) return 0;
    
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const sleepMinutes = 8 * 60; // 8 horas en minutos
    const totalDayMinutes = 24 * 60; // 24 horas en minutos
    const classMinutes = end - start;
    
    return totalDayMinutes - sleepMinutes - classMinutes;
}

// Iniciar recordatorio
function startReminder() {
    // Encontrar la siguiente actividad pendiente con mayor prioridad
    const pendingActivities = activities.filter(activity => activity.status === 'pendiente');
    
    if (pendingActivities.length === 0) {
        showNotificationInternal('No hay actividades pendientes.', 'info');
        return;
    }
    
    // Ordenar por prioridad
    const priorityOrder = {
        'muy-alta': 4,
        'alta': 3,
        'media': 2,
        'baja': 1
    };
    
    pendingActivities.sort((a, b) => {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    // Encontrar el índice de la actividad en el array original
    currentActivityIndex = activities.findIndex(activity => activity.id === pendingActivities[0].id);
    
    // Configurar el tiempo restante
    remainingTime = timeToMinutes(activities[currentActivityIndex].hours);
    
    // Actualizar la interfaz
    updateCurrentActivityDisplay();
    
    // Iniciar el intervalo de notificaciones (cada 10 segundos para la demo)
    reminderInterval = setInterval(updateReminder, 10000);
    
    // Habilitar el botón de completar actividad
    completeActivityBtn.disabled = false;
    
    // Deshabilitar el botón de iniciar recordatorio
    startReminderBtn.disabled = true;
    
    const message = `¡Comenzando actividad: ${activities[currentActivityIndex].displayName}!`;
    showNotificationInternal(message, 'success');
    showBrowserNotification("Actividad Iniciada", message);
}

// Actualizar recordatorio
function updateReminder() {
    if (remainingTime <= 0) {
        completeActivity();
        return;
    }
    
    // Restar 10 segundos (en minutos sería 10/60 ≈ 0.1667)
    // Para la demo, restamos 1 minuto cada 10 segundos para que sea más visible
    remainingTime -= 1;
    
    // Actualizar la interfaz
    updateCurrentActivityDisplay();
    
    // Mostrar notificación cada 10 segundos
    const hours = Math.floor(remainingTime / 60);
    const minutes = remainingTime % 60;
    
    const message = `Tiempo restante para ${activities[currentActivityIndex].displayName}: ${hours}h ${minutes}m`;
    showNotificationInternal(message, 'info');
    
    // Notificación del navegador cada 30 segundos (cada 3 notificaciones internas)
    if (remainingTime % 30 === 0) {
        showBrowserNotification("Tiempo Restante", message);
    }
}

// Actualizar la visualización de la actividad actual
function updateCurrentActivityDisplay() {
    if (currentActivityIndex === -1 || !activities[currentActivityIndex]) {
        currentActivityDiv.innerHTML = '<p>No hay actividad en curso</p>';
        return;
    }
    
    const activity = activities[currentActivityIndex];
    const hours = Math.floor(remainingTime / 60);
    const minutes = remainingTime % 60;
    
    currentActivityDiv.innerHTML = `
        <h3>Actividad Actual: ${activity.displayName}</h3>
        <p><strong>Prioridad:</strong> ${getPriorityDisplayName(activity.priority)}</p>
        <p><strong>Tiempo asignado:</strong> ${activity.hours}</p>
        <p><strong>Tiempo restante:</strong> ${hours}h ${minutes}m</p>
    `;
}

// Completar actividad
function completeActivity() {
    if (currentActivityIndex === -1) {
        showNotificationInternal('No hay actividad en curso.', 'info');
        return;
    }
    
    const activity = activities[currentActivityIndex];
    
    // Marcar como completada
    activity.status = 'completada';
    
    // Mostrar mensaje de felicitación
    const message = `¡Felicidades! Has completado la actividad: ${activity.displayName}`;
    showNotificationInternal(message, 'success');
    showBrowserNotification("¡Actividad Completada!", message);
    
    // Detener el recordatorio
    stopReminder();
    
    // Actualizar la tabla
    renderActivitiesTable();
    
    // Buscar siguiente actividad
    findNextActivity();
}

// Detener recordatorio
function stopReminder() {
    if (reminderInterval) {
        clearInterval(reminderInterval);
        reminderInterval = null;
    }
    
    // Reiniciar la actividad actual
    currentActivityIndex = -1;
    
    // Actualizar la interfaz
    updateCurrentActivityDisplay();
    
    // Habilitar el botón de iniciar recordatorio si hay actividades pendientes
    const pendingActivities = activities.filter(activity => activity.status === 'pendiente');
    startReminderBtn.disabled = pendingActivities.length === 0;
    
    // Deshabilitar el botón de completar actividad
    completeActivityBtn.disabled = true;
}

// Encontrar siguiente actividad
function findNextActivity() {
    const pendingActivities = activities.filter(activity => activity.status === 'pendiente');
    
    if (pendingActivities.length > 0) {
        // Esperar 3 segundos antes de iniciar la siguiente actividad
        setTimeout(() => {
            startReminder();
        }, 3000);
    } else {
        const message = '¡Has completado todas tus actividades! Buen trabajo.';
        showNotificationInternal(message, 'success');
        showBrowserNotification("¡Todas las Actividades Completadas!", message);
    }
}

// Mostrar notificación interna
function showNotificationInternal(message, type) {
    notificationArea.textContent = message;
    notificationArea.className = `notification active ${type}`;
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        notificationArea.classList.remove('active');
    }, 5000);
}