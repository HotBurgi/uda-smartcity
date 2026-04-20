# PROGETTO DI GRUPPO – UDA STEM - SMARTCITY

**Applicazione web per la gestione smart dei parcheggi cittadini della città di Brescia.**

Questo progetto è stato realizzato come prototipo per l'Ufficio Mobilità Sostenibile, rispettando tutti i vincoli richiesti dalla traccia. Abbiamo sviluppato un'applicazione moderna che separa il frontend dal backend, garantendo sicurezza e facilità d'uso sia per i cittadini che per gli amministratori.

---

## Le Tecnologie che abbiamo scelto

- **Frontend:** ReactJS + JSX (Interfaccia moderna e dinamica senza ricaricamento della pagina, in puro stile "Glassmorphism").
- **Backend:** Python 3 con micro-framework Flask (Espone le API HTTP/REST).
- **Database:** MySQL 8 (Persistenza dei dati, relazionale, con calcoli in tempo reale sulle disponibilità).
- **Infrastruttura:** Docker e Docker Compose (Per avviare tutto il pacchetto in modo semplice e identico su qualsiasi PC).

---

## Istruzioni per avviare il progetto

Per testare la nostra applicazione, abbiamo preparato un ambiente `docker-compose` automatico. Non c'è bisogno di installare Python o Node.js nel computer host, ma solo **Docker**.

### Passo 1: Avviare i server

Apri il terminale all'interno di questa cartella (dove si trova il file `docker-compose.yml`) e lancia:

```bash
docker compose up --build -d
```

_Questo comando scaricherà l'occorrente e avvierà il database, il server backend e la pagina web in background._

### Passo 2: Utilizzare l'Applicazione

A questo punto è tutto pronto! Apri il browser e vai agli indirizzi:

- **L'App (Frontend):** [http://localhost:3000](http://localhost:3000)
- **Visualizzatore Database (phpMyAdmin):** [http://localhost:8080](http://localhost:8080) _(Opzionale, serve per ispezionare se i dati passano al database)._

---

## Credenziali per il test

Abbiamo predisposto già nel database due account per testare l'applicativo:

### 1) Account Cittadino (User)

Utilizza queste credenziali per vedere la prenotazione dei parcheggi:

- Username: `user1`
- Password: `user1_password`

### 2) Account Amministratore (Admin)

Utilizza queste credenziali per vedere i grafici dei trend a 30 giorni e l'aggiunta di nuove aree:

- Username: `admin`
- Password: `admin_password`

---

## Come spegnere il progetto

Al termine della valutazione, per chiudere in sicurezza tutti i server e liberare la rete, digita nel terminale:

```bash
docker compose down
```

Grazie per l'attenzione!
_Il gruppo di sviluppo._
