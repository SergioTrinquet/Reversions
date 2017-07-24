function ParamsDatePickers(DatePickerDebut, DatePickerFin, minDateDebut, maxDateFin) {

    DatePickerDebut.datepicker({
        showAnim: "slideDown",
        dayNamesMin: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"],
        minDate: minDateDebut, /// La date minimum selectionnable : 24 mois avant la date d'aujourd'hui, donc ici "-24m". On peut mettre aussi un objet Date ou un String. Si la promotion est obsolète, date min. est = à la date déjà inscrite ds ce champ (sinon bug), sinon date du jour. 
        maxDate: ($.trim(DatePickerFin.val()) != "" ? DatePickerFin.val() : "+24m"), /// La date max. selectionnable : ici si 'Date de Fin' rempli, maxDate de 'Date Début' = valeur de 'date de Fin', sinon 24 mois après la date du jour ("+24m"). On peut mettre aussi un objet Date ou un nombre
        changeMonth: true,
        changeYear: true,
        onClose: function (selectedDate) {
            /// Sur l'ev. OnClose de la 'Date de Départ', le minDate du champ 'Date de Fin' est égal au lendemain de la date du jour (+1) si pas de date ds 'Date de Départ', sinon date sélectionnée ds 'Date de Départ'
            DatePickerFin.datepicker("option", "minDate", ($.trim($(this).val()) == "" ? +1 : DatePlusOneDay(selectedDate)));
        }
    });

    DatePickerFin.datepicker({
        showAnim: "slideDown",
        dayNamesMin: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"],
        minDate: ($.trim(DatePickerDebut.val()) != "" ? DatePickerDebut.val() : +1), /// La date minimum selectionnable : A number of days from today. Donc ici +1 = demain. On peut mettre aussi un objet Date ou un String
        maxDate: maxDateFin, /// La date max. selectionnable : ici 24 mois après la date du jour. On peut mettre aussi un objet Date ou un nombre       
        changeMonth: true,
        changeYear: true,
        onClose: function (selectedDate) {
            /// Sur l'ev. OnClose de la 'Date de Fin', le maxDate du champ 'Date de Début' est égal à la date sélectionnée ds 'Date de Fin'
            DatePickerDebut.datepicker("option", "maxDate", selectedDate);
        }
    });

}


function DatePlusOneDay(dt) {
    tab_dt = (dt.split(/[- //]/));
    result = new Date(tab_dt[2], parseInt(tab_dt[1]) - 1, tab_dt[0]);
    result.setDate(result.getDate() + 1);
    return result;
}