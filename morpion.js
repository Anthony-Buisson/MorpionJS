import {GraphiquesMorpion} from './GraphiquesMorpion.js';

let random = (min, max)=> Math.floor(Math.random() * (max+1 - min) + min);

class Morpion {

    constructor(){
        Morpion.CROIX = 1;
        Morpion.RONDS = -1;
        Morpion.NEUTRE = 0;
        this.cellNumber = parseInt(document.querySelector('#morpionZone').getAttribute('morpionSize') ?? 5);
        let cellWidth = parseInt(document.querySelector('#morpionZone').getAttribute('morpionCellWidth') ?? 152);
        this.canva = new GraphiquesMorpion(cellWidth, this.cellNumber);
        this.canva.dessinerGrille();
        this.canva.afficherPanneauControles();
        if(!this.recupererAnciennePartie()) this.creerNouvelleSauvegarde();
        this.creerEvenements();
        this.canva.afficherTour(this.resultats, this.tourRond);
    };

    creerEvenements = ()=>{
        this.bot   = this.canva.boutonBot.checked;
        this.debug = this.canva.boutonDebug.checked;
        this.croix = this.canva.inputCroix.value;
        this.ronds = this.canva.inputRonds.value;

        this.canva.canvas.onclick                    = this.jouerCoup;
        this.canva.boutonReinitialiserPartie.onclick = this.reinitialiserPartie;
        this.canva.boutonReinitialiserGrille.onclick = this.reinitialiserGrille;

        this.canva.boutonDebug.onchange = el => this.debug = el.target.checked;
        this.canva.boutonBot.onchange   = el => this.bot   = el.target.checked;
        this.canva.inputCroix.onchange  = el => this.croix = el.target.value;
        this.canva.inputRonds.onchange  = el => this.ronds = el.target.value;
    };

    initialiserValeurs = ()=> {
        this.grille = new Array(this.cellNumber);
        for (let i = 0; i < this.cellNumber; i++) {
            let val = new Array(this.cellNumber);
            val.fill(0);
            this.grille[i] = val;
        }
        [this.tourRond, this.gagnant, this.nbCoups] = [false, false, 0];
    };

    reinitialiserPartie = ()=>{
        localStorage.clear();
        this.creerNouvelleSauvegarde();
        this.canva.dessinerGrille();
        this.canva.afficherTour(this.resultats, this.tourRond);
    };

    reinitialiserGrille = ()=>{
        this.initialiserValeurs();
        this.mettreAJourPartie();
        this.canva.dessinerGrille();
        this.canva.afficherTour(this.resultats, this.tourRond);
    };

    recupererAnciennePartie = ()=>{
        let historiquePartie = JSON.parse(localStorage.getItem('morpion'));
        if(!historiquePartie || historiquePartie.parties[historiquePartie.parties.length-1].grille.length !== this.cellNumber) return false;
        this.resultats              = historiquePartie.resultats;
        this.parties                = historiquePartie.parties;
        this.grille                 = this.parties[this.parties.length-1].grille;
        this.tourRond               = this.parties[this.parties.length-1].tourRond;
        this.nbCoups                = this.parties[this.parties.length-1].nbCoups;
        this.gagnant                = this.parties[this.parties.length-1].gagnant;
        this.canva.inputCroix.value = this.parties[this.parties.length-1].croix;
        this.canva.inputRonds.value = this.parties[this.parties.length-1].ronds;
        for (let i = 0; i < this.grille.length; i++) {
            for (let j = 0; j < this.grille.length; j++) {
                if(this.grille[i][j] !== 0) this.canva.afficherJeton(j,i, this.grille[i][j] < 0);
            }
        }
        return true;
    };

    /**
     * Met à jour le localStorage
     * (utilisée à chaque coup valide)
     */
    mettreAJourPartie = ()=>{
        this.parties[this.parties.length-1] = {
            grille:   this.grille,
            tourRond: this.tourRond,
            nbCoups:  this.nbCoups,
            croix:    this.croix,
            ronds:    this.ronds,
            gagnant:  this.gagnant,
        };
        localStorage.setItem('morpion', JSON.stringify({
            resultats: this.resultats,
            parties:   this.parties
        }));
    };

    /**
     * Crée une partie et la sauvegarde en localStorage
     * (utilisée lorsqu'il n'y a pas de parties en localstorage)
     */
    creerNouvelleSauvegarde = ()=>{
        this.resultats = [0,0,0];
        this.initialiserValeurs();
        this.parties = [{
            grille:   this.grille,
            tourRond: this.tourRond,
            nbCoups:  this.nbCoups,
            croix:    this.croix,
            ronds:    this.ronds,
            gagnant:  false
        }];
        this.mettreAJourPartie();
    };

    /**
     * Méthode appellée à chaque coup joué
     * (par le joueur ou un bot)
     * @param evt
     */
    jouerCoup = (evt)=>{
        let coordX;
        let coordY;
        if(evt) {
            coordX = Math.trunc(evt.layerX / this.canva.cellSize);
            coordY = Math.trunc(evt.layerY / this.canva.cellSize);
        }else{
            let coords = this.meilleurCoup();
            console.log(coords.i+' j : '+ coords.j)
            coordX = coords.i;
            coordY = coords.j;
        }

        /*Le coup est valide*/
        if(this.grille[coordY][coordX] === Morpion.NEUTRE) {
            this.canva.afficherJeton(coordX, coordY, this.tourRond);
            this.canva.afficherTour(this.resultats, !this.tourRond);

            this.grille[coordY][coordX] = this.tourRond ? Morpion.RONDS : Morpion.CROIX;
            this.tourRond               = !this.tourRond;
            this.nbCoups++;
            this.mettreAJourPartie();
            switch (this.verifierFin()){
                case 1: {
                    this.resultats[0]++;
                    this.finPartie(`${this.croix} gagne !`);
                    break;
                }
                case -1 : {
                    this.resultats[1]++;
                    this.finPartie(`${this.ronds} gagne !`);
                    break;
                }
                case 0 : {
                    this.resultats[2]++;
                    this.finPartie('Égalité !');
                    break;
                }
                case null : {
                    if((this.bot && this.tourRond && this.nbCoups < this.grille.length*this.grille.length) || (this.debug)) {
                        this.jouerCoup();
                    }
                }
            }
        }
        /*Le coup n'est pas valide : le bot rejoue et le joueur doit recliquer*/
        else if(!evt)
            console.error('Meilleur coup invalide !')
    };

    /**
     *
     * @returns {number} si le coup est gagnant ou non :
     * 1    - croix gagne
     * -1   - ronds gagne
     * 0    - égalité
     * null - le jeu n'est pas fini
     */
    verifierFin = (grille = this.grille, nbCoups = this.nbCoups)=>{
        let len = grille.length-1;
        for (let i = 0; i <= len; i++) {
            for (let j = 0; j < this.cellNumber-3; j++) {
                /*Verification des lignes et colonnes*/
                if ((grille[i][j] + grille[i][1 + j] + grille[i][2 + j] + grille[i][3 + j] === 4) ||
                    (grille[j][i] + grille[1 + j][i] + grille[2 + j][i] + grille[3 + j][i]) === 4)
                    return 1;
                if ((grille[i][j] + grille[i][1 + j] + grille[i][2 + j] + grille[i][3 + j] === -4) ||
                    (grille[j][i] + grille[1 + j][i] + grille[2 + j][i] + grille[3 + j][i]) === -4)
                    return -1;
                /*Verification des diagonales*/
                if (i < this.cellNumber-3) {
                    let diagHGBD = grille[i][j] + grille[i + 1][j + 1] + grille[i + 2][j + 2] + grille[i + 3][j + 3];
                    let diagBDHG = grille[j][i] + grille[j + 1][i + 1] + grille[j + 2][i + 2] + grille[j + 3][i + 3];
                    let diagHDBG = grille[i][len - j] + grille[i + 1][len - j - 1] + grille[i + 2][len - j - 2] + grille[i + 3][len - j - 3];
                    let diagBGHD = grille[len - j][len - i] + grille[len - j - 1][len - i - 1] + grille[len - j - 2][len - i - 2] + grille[len - j - 3][len - i - 3];
                    if ((diagHGBD === 4) || (diagBDHG === 4) || (diagHDBG === 4) || (diagBGHD === 4))
                        return 1;
                    if ((diagHGBD === -4) || (diagBDHG === -4) || (diagHDBG === -4) || (diagBGHD === -4))
                        return -1;
                }
            }
        }
        /*Aucun gagnant, on teste l'égalité*/
        return nbCoups === (this.cellNumber*this.cellNumber) ? 0 : null;
    };

    finPartie = (message = null)=>{
        if(message) {
            this.gagnant = true;
            this.canva.afficherEcranFin(message);
            this.initialiserValeurs();
            this.parties.push( {
                grille:   this.grille,
                tourRond: this.tourRond,
                nbCoups:  this.nbCoups,
                croix:    this.croix,
                ronds:    this.ronds,
                gagnant:  false
            });
            this.mettreAJourPartie();
            this.canva.afficherTour(this.resultats, this.tourRond);
            this.canva.canvas.onclick = ()=>this.finPartie();
        }else{
            this.canva.dessinerGrille();
            this.canva.canvas.onclick = this.jouerCoup;
        }
    };

    meilleurCoup = ()=> {
        // AI to make its turn
        let bs = Infinity;
        let move;
        for (let i = 0; i < this.grille.length; i++) {
            for (let j = 0; j < this.grille.length; j++) {
                // Is the spot available?
                if (this.grille[j][i] === 0) {
                    this.grille[j][i] = Morpion.RONDS;
                    let s = this.minimax( this.grille, this.nbCoups+1, 0, true);
                    this.grille[j][i] = 0;
                    if (s < bs) {
                        bs = s;
                        move = {i: i,j: j };
                    }
                }
            }
        }
        console.log('Prediction : ', bs);
        return move;
    };

    minimax = (grid, coups,depth, isMaximizing, alpha = Infinity, beta = -Infinity) => {
        let board = JSON.parse(JSON.stringify(grid));
        let result = this.verifierFin(board, coups);
        if (result !== null) return result;
        if(depth > 5) return isMaximizing ? -999 : 999;
        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < board.length; i++) {
                for (let j = 0; j < board.length; j++) {
                    if (board[j][i] === 0) {
                        board[j][i] = Morpion.CROIX;
                        if(beta>=alpha){
                            board[j][i]= Morpion.NEUTRE;
                            continue;
                        }
                        let score = parseInt(this.minimax(board,coups+1,depth + 1, false, alpha, beta));
                        board[j][i] = 0;
                        if(score > bestScore) {
                            bestScore = score;
                            beta = bestScore
                        }
                    }
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < board.length; i++) {
                for (let j = 0; j < board.length; j++) {
                    if (board[j][i] === 0) {
                        board[j][i] = Morpion.RONDS;
                        if(beta>=alpha){
                            board[j][i]= Morpion.NEUTRE;
                            continue;
                        }
                        let score = parseInt(this.minimax( board,coups+1, depth + 1, true, alpha, beta));
                        board[j][i] = 0;
                        if(score < bestScore) {
                            bestScore = score;
                            alpha = bestScore
                        }
                    }
                }
            }
            return bestScore;
        }
    };
}
let mp = new Morpion();