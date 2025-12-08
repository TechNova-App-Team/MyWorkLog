# 🚀 TIME.PRO – Intelligentes Gleitzeit- & Karriere-Tracking
## Deep-Dive Analytics & Next-Gen P2P Sync Time Tracker

[![GitHub license](https://img.shields.io/github/license/TechNova-App-Team/TimeTracker-Ausbildung-Arbeit)](https://github.com/TechNova-App-Team/TimeTracker-Ausbildung-Arbeit/blob/main/LICENSE.md)
[![GitHub stars](https://img.shields.io/github/stars/TechNova-App-Team/TimeTracker-Ausbildung-Arbeit?style=social)](https://github.com/TechNova-App-Team/TimeTracker-Ausbildung-Arbeit)
[![GitHub forks](https://img.shields.io/github/forks/TechNova-App-Team/TimeTracker-Ausbildung-Arbeit?style=social)](https://github.com/TechNova-App-Team/TimeTracker-Ausbildung-Arbeit/fork)
[![Tech Stack](https://img.shields.io/badge/Tech-HTML%2FCSS%2FJS-orange)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![P2P WebRTC](https://img.shields.io/badge/P2P-WebRTC-informational)](https://webrtc.org/)

## ✨ Überblick & Vision
**Big Update coming Soon! V2.0.1 ~ 10.12.25**

**TIME.PRO** ist nicht nur ein weiterer Zeiterfasser – es ist ein **datengesteuertes Performance-Cockpit**, das dir hilft, deine Arbeitszeit, deine Produktivität und deine Karriereziele (insbesondere im Kontext der **IHK-Ausbildung** und **Berufsschule**) zu visualisieren und zu optimieren.
**https://technova-app-team.github.io/TimeTracker-Ausbildung-Arbeit/**

Das Projekt setzt auf modernes **Glassmorphism-Design** und nutzt fortschrittliche Frontend-Technologien, um eine schnelle, **datenschutzfreundliche** (LocalStorage-basiert) und **offline-fähige** Nutzererfahrung zu bieten.

### 🌟 Kern-Features

* **P2P Live-Sync (WebRTC):** Teile deinen Timer und deine Einträge **direkt** und **verschlüsselt** mit Kollegen, ohne zentrale Server.
* **Deep-Dive Performance-Analyse:** Visualisiere Wochen-Soll-Ist, Projekt-Verteilung und Produktivitäts-Heatmaps (z.B. Ø Saldo pro Wochentag / Stunde).
* **IHK- & Schul-Audit:** Verfolge den Ausbildungsfortschritt, Noten-Durchschnitte und Fehlzeiten-Compliance.
* **Prognose & Zukunftsplanung:** Simuliere die Auswirkungen von Urlaub/Krankheit auf deinen Gleitzeit-Saldo bis zu 4 Wochen im Voraus.
* **Smart Alerts System:** Erhalte Benachrichtigungen bei kritischen Saldo-Ständen, langen Schichten (>10h) oder geringem Urlaubsanspruch.

## 💻 Tech Stack & Design-Philosophie

| Komponente | Technologie / Stil | Beschreibung |
| :--- | :--- | :--- |
| **Frontend** | Plain HTML5, CSS3, Vanilla JS | Minimaler Overhead, maximale Performance – keine Frameworks. |
| **Design** | **Glassmorphism** & Dark Mode | Ästhetische, tiefdunkle Oberfläche mit transparenten, geblurrten Elementen. |
| **P2P Sync** | [Simple-Peer](https://github.com/feross/simple-peer) (WebRTC) | Direkte Peer-to-Peer-Verbindungen für verschlüsselten Datenaustausch. |
| **Charts/Visuals** | Pure SVG & CSS Grids | Maßgeschneiderte, animierte Kreisdiagramme und Balkendiagramme. |
| **Data Storage**| `localStorage` | Vollständig DSGVO-konform, alle Daten bleiben lokal im Browser. |

## 🖼️ Einblicke in die Features

### Performance-Analyse: Produktivität im Detail

Die Analyse-Ansicht zeigt nicht nur Saldo-Werte, sondern geht tief in die Muster deiner Arbeitszeit.
* **Wöchentlicher Soll/Ist-Vergleich**
* **Ø Saldo pro Wochentag**
* **Tages-Heatmap** (Wann bist du am produktivsten?)


### IHK & Berufsschul-Audit

Kontrolliere deine Ausbildung auf einen Blick. Countdown zur Prüfung, Noten-Durschnittsberechnung und Fehlzeiten-Warnungen (z.B. Max. 10% Fehlzeit).


### P2P Team-Sync (Echtzeit-Zusammenarbeit)

Teile deinen Timer-Status und deine Einträge in Echtzeit mit deinem Team, ohne deine Daten auf externen Servern speichern zu müssen.


## 🛠️ Installation & Lokaler Start

Da TIME.PRO ein reines Frontend-Projekt ist, ist der Start extrem einfach.

1.  **Repository klonen:**
    ```bash
    git clone [https://github.com/TechNova-App-Team/TimeTracker-Ausbildung-Arbeit.git](https://github.com/TechNova-App-Team/TimeTracker-Ausbildung-Arbeit.git)
    cd TimeTracker-Ausbildung-Arbeit
    ```
2.  **Im Browser öffnen:**
    Öffne einfach die Datei `index.html` in deinem bevorzugten modernen Webbrowser (Chrome, Firefox, Edge).
    ```bash
    # Beispiel (kann je nach System variieren)
    open index.html 
    ```

> **Hinweis zur P2P-Funktionalität:** WebRTC P2P Sync nutzt `localStorage` als **Signaling Channel** – das bedeutet, Host und Client müssen kurzzeitig auf dieselbe `localStorage`-Instanz zugreifen (z.B. durch das Teilen des Connection-Codes).

## 🤝 Mitwirken & Community

Wir freuen uns über jede Form von Beitrag! Egal, ob du Bugs findest, Code schreibst oder neue Ideen einbringst – du machst TIME.PRO besser.

* Lies unsere [CONTRIBUTING.md](https://github.com/TechNova-App-Team/TimeTracker-Ausbildung-Arbeit/blob/main/CONTRIBUTING.md).
* Verhalte dich fair und respektvoll (siehe [CODE\_OF\_CONDUCT.md](https://github.com/TechNova-App-Team/TimeTracker-Ausbildung-Arbeit/blob/main/CODE_OF_CONDUCT.md)).

### ⭐ Roadmap & Ideen

* Monatlicher PDF/Excel-Report-Export.
* Erweiterte KI-Funktionen für Saldo-Optimierung.
* Automatische Pausen-Erkennung (basierend auf Timer-Daten).
* Erweiterung der IHK-Sektion um Ausbildungsnachweise.

## 📄 Rechtliche Hinweise & Lizenz

* **Datenschutz:** Alle Details findest du in unserer [DSGVO.html](https://technova-app-team.github.io/TimeTracker-Ausbildung-Arbeit/DSGVO.html) und [PRIVACY.md](https://github.com/TechNova-App-Team/TimeTracker-Ausbildung-Arbeit/blob/main/PRIVACY.md).
* **Impressum:** Das [Impressum.html](https://technova-app-team.github.io/TimeTracker-Ausbildung-Arbeit/Impressum.html) enthält alle notwendigen Angaben.

* **Lizenz:** Dieses Projekt steht unter der MIT-Lizenz. Details siehe in der [LICENSE.md](https://github.com/TechNova-App-Team/TimeTracker-Ausbildung-Arbeit/blob/main/LICENSE.md) Datei.
