Let's improve the patient booking flow, following are my suggestions:
1. Make the form progressive and cater to all the edge cases gracefully. 
2. As a first step, we only ask for patients mobile no. If it's a new no. we ask for the name and Preferred Date & Time. we register the new no. but the appointent created will be tentative. 
3. If the phone no is already in the database, we display the name of the associated patient and ask the user whether to continue with the same name(If Single)/ choose from the list (If multiple) or if the appointment is for a different patient. 
4. If continued with existing name, ask whether it is a follow up or new consultation and select the preferred date and time to book the appointment. 
5. If new patient on same phome no. ask for the name and preffered date and time to book. 
6. If a tentative appointment is already created for this no. Tell appointment is already booked with the appointment detail. Ask if they want to cancel and book a new one or they are booking for a different person. Delete the previous booking and create a new one with a new date and time. If booking for diffrent person, create a new tentative appointment with the new name but same no.  
7. If the tentative appointment is created but wasn't confirmed or was cancelled. we register the patient with this number but no appointment. If this type of number is entered we display the name tell the earlier appointment was cancelled. Choose a preffered date and time to book a new one. 

What do you think about this flow? What issues or flaws do you see in this approach? What are your recommendations to further improve this flow? What edge cases are we missing?