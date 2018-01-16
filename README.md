**Présentation du projet**
==

Le projet "Reversions" est développé en node.js.  
Il est installé sur le serveur de production sur un IIS.  
Le site interroge le format de base de données SQL Server.    


**Etapes pour mettre en production le projet "Reversions"**
==

**GULP**
--

Si cela n'est pas déjà fait, installez *'npm'*, puis *'gulp'* :
- Pour installer *npm*, allez sur le site de npm.
- Pour installer *gulp*, tapez dans une invite de commande ou dans le terminal de VS Code 'npm install -g gulp' pour l'installer globalement afin qu'il soit executable de n'importe où sur votre PC, et installez gulp aussi localement (pour cela, placez-vous au niveau du répertoire du projet avec le terminal et tapez 'npm install --save-dev').

Executez la tache *'prod'* avec la commande gulp dans le terminal (l'invite de commande) : *'gulp prod'*.  
Cela va générer de nouveaux fichiers .js et .css optimisés (+ des .map) à partir de ceux existants afin d'obtenir des fichiers plus léger et moins nombreux (donc moins d'URLs appelées au chargement d'une page).  
Les fichiers source se trouvent dans 'public/assets/src'. La commande gulp va créer un répertoire 'public/assets/dist' dans lequel se trouveront les nouveaux fichiers générés.

**Copie de fichiers sur le serveur**
--

Allez sur le serveur.  
Copiez une partie des fichiers du projet, mais pas tous.  

Fichiers à ne pas copier car écraseraient l'existant :
- Les fichiers 'log/logfile_All.log' et 'log/logfile_Error.log'

Fichiers et répertoires à ne pas copier car inutiles pour le fonctionnement en production, mais pas bloquants : 
- .gitignore
- gulpfile.js
- package.json
- package-lock.json
- Répertoire .Git
- Répertoire .vscode
- Répertoire 'public/assets/src'