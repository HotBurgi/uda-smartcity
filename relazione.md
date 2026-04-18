# Analisi dei Requisiti: SmartCity Parking

### Stakeholder

- Studenti dell'ITIS Castelli: Sviluppatori del sistema.
- Amministratori Comunali: Clienti interessati alla gestione del traffico e dei parcheggi.
- Cittadini/Utenti finali: Portatori di interesse che utilizzano l'app per trovare parcheggio.

## Analisi requisiti

### 1. Funzionali: 
Il sistema deve consentire l'autenticazione degli utenti o amministratori tramite una pagina di login. Deve permettere agli utenti la visualizzazione in tempo reale dello stato dei parcheggi (liberi/occupati), per consentire a loro di prenotare tramite un form con data e orario il parcheggio in un'area specifica. All'utente inoltre deve essere consentito di visualizzare in una pagina a parte le prenotazioni da lui effettuate. Deve fornire un'interfaccia amministrativa per poter aggiungere zone di sosta e controllare con appositi grafici le prenotazioni effettuate nell'ultimo mese. 


### 2. Non funzionali:
I dati degli utenti devono essere protetti da password e crittografia. L'interfaccia deve essere intuitiva e facile da usare: con bottoni ben visibili. Il sistema deve essere responsive consentendo così l'utilizzo da telefono.

### 3. Di dominio: 

I parcheggi devono essere raggruppati in Aree (es. Centro Storico, Zona Industriale), ognuna con orari di vigenza.
Garantire agli utenti l'integrità dei dati e che questi non vadano persi o divulgati.

### 4. Di vincolo: 
-   ﻿﻿Frontend e backend devono essere separati.
-   ﻿﻿Il backend deve esporre API HTTP/REST.
- L'autenticazione deve essere gestita tramite login e cookie di sessione.
-   ﻿﻿I dati devono essere salvati in una base dati scelta dal gruppo.
-   ﻿﻿II prototipo deve distinguere almeno due ruoli: user e admin.
-   ﻿﻿Le funzionalità devono essere testate anche tramite file .http o strumenti equivalenti.

### 5. Concorrenza
Sistemi di Gestione Comunali Standard: Spesso sono database datati che richiedono inserimenti manuali. Il progetto è superiore grazie all'interfaccia React moderna e alla gestione automatizzata dei ruoli (Admin/User).

### 6. Fattibilità
la fattibilità risulta estremamente elevata: tecnicamente, lo stack React-Python assicura scalabilità e performance; economicamente, l’abbattimento dei costi di manutenzione hardware rende il sistema altamente sostenibile e pronto per l'implementazione in contesti urbani moderni.

## Progettazione

**Architettura del sistema:**

1.  **UI (Frontend):** Sviluppata in JavaScript (React). Gestisce le chiamate API verso il backend.
    
2.  **Logic (Backend):** Sviluppata in Python (Flask/FastAPI). Elabora i dati e gestisce la logica dei parcheggi.
    
3.  **Persistenza (Database):** MySQL 8.0. Archivia le tabelle definite nello `schema.sql`.


**Struttura database:**
-   **`users`**: Archivia le credenziali (username/password) e i livelli di privilegio (admin/user) per gestire l'accesso sicuro all'app.
    
-   **`parking_areas`**: Registra il nome dell'area del parcheggio  e la massima capacità.
    
-   **`bookings`**: Traccia le prenotazioni attive degli utenti, collegando l'identificativo del cittadino all'identificativo del parcheggio.

**tabella prenotazioni**
| id | user_id | area_id | start_time | end_time|
| :---: | :---: | :---: | :---: | :---: |
|1| 3 | 5 |17:30 |18:30|
|2|6|5|18:00|19:30|

## Implementazione


### Gestione delle rotte

**Backend**:  L'adozione dei metodi GET e POST è stata dettata dalla necessità di standardizzare la comunicazione tra i moduli, garantendo che le operazioni di sola consultazione (GET) siano distinte da quelle che comportano l'invio di dati sensibili o modifiche allo stato del sistema (POST).

```
@app.route('/api/bookings/my_history', methods=['GET'])

def  my_history():

if  'user_id'  not  in session:
return jsonify({"error": "Unauthorized"}), 401
conn = get_db()
cursor = conn.cursor(dictionary=True)
 #Calcola lo stato direttamente in query in base all'ora corrente.

cursor.execute("""
SELECT b.id, b.area_id, a.name as area_name, b.start_time, b.end_time,
IF(NOW() BETWEEN b.start_time AND b.end_time, 'Active', 'Expired') as status
FROM bookings b
JOIN parking_areas a ON b.area_id = a.id
WHERE b.user_id = %s
ORDER BY b.start_time DESC
""", (session['user_id'],))


history = cursor.fetchall()
cursor.close()
conn.close()
return jsonify(history)
```


**Frontend**:  Per garantire che l'accesso alle diverse sezioni dell'applicazione sia limitato in base all'identità dell'utente, è stato implementato un sistema di Routing Protetto.

Rotte utente:
```
<Route path="/dashboard"
element={
<ProtectedRoute  allowedRoles={["user"]}>
<UserDashboard  />
</ProtectedRoute>
}
/>
```
Rotte amministratore:
```
<Route
path="/admin/history"
element={
<ProtectedRoute  allowedRoles={["admin"]}>
<AdminHistory  />
</ProtectedRoute>
}
/>
```

## 5. Distribuzione

-   Il codice è rilasciato su GitHub: https://github.com/HotBurgi/uda-smartcity.
    



## 6. Manutenzione ed evoluzione
    
Il sistema può essere potenziato attraverso l'integrazione di sistemi di pagamento digitali (come Stripe o PayPal) per automatizzare le transazioni direttamente dall'app. Un'altra evoluzione naturale riguarda l'integrazione di algoritmi di Machine Learning che, analizzando lo storico dei dati raccolti nel database, siano in grado di prevedere l'affluenza nelle diverse aree cittadine, suggerendo all'utente il momento migliore per trovare parcheggio.

