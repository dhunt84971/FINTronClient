function div_treeview(divTVElement, divTVDelimeter) {

    var onSelect_Callback;

    function addTVText(parent, text) {
        var newItem = document.createElement("div");
        //newItem.innerText = text;
        newItem.classList.add("div_treeview_item");
        newItem.classList.add("div_treeview_hbox");
        newItem.innerHTML = "<div class='div_treeview_marker'>-</div>" + text;
        parent.appendChild(newItem);
    }

    function addTVItem(parent, tvData, isSubitem) {
        var tvItems = tvData.split(divTVDelimeter);

        if (!parent){
            parent = divTVElement;
        }
        var elements = parent.children;
        if (tvItems.length > 0) {
            // if there are some children elements see if this tvItem is among them.
            var i = 0;
            var found = false;
            while (i < elements.length && !found) {
                var newParent = elements[i];
                if (!newParent.classList.contains("div_treeview_item")) {
                    if (newParent.children[0].innerText == tvItems[0]) {
                        // A match was found.
                        found = true;
                        // Continue if there is a subitem in tvItem.
                        if (tvItems.length > 1) {
                            tvItems.shift();
                            var newTVData = tvItems.join(divTVDelimeter);
                            addTVItem(newParent, newTVData, true);
                        }
                        return;
                    }
                }
                i++;
            }
            // if the tvItem was not found add it to the parent.
            if (!found) {
                var newItem = document.createElement("div");
                newItem.classList.add("div_treeview_vbox");
                isSubitem ? newItem.classList.add("div_treeview_leftMargin") : null;
                var newParent = parent.appendChild(newItem);
                addTVText(newParent, tvItems[0]);

                // if there are any items left to add then recurse.
                if (tvItems.length > 1) {
                    tvItems.shift();
                    var newTVData = tvItems.join(divTVDelimeter);
                    addTVItem(newParent, newTVData, true);
                }
                return;
            }
        }
    }

    function loadItems(tvDatas) {
        for (var i = 0; i < tvDatas.length; i++) {
            addTVItem(divTVElement, tvDatas[i], false);
        }
    }

    function onSelect(callback){
        onSelect_Callback = callback;
        divTVElement.ownerDocument.addEventListener("click", (e)=>{
            if (e.target.classList.contains("div_treeview_item")){
                removeAllSelected(divTVElement);
                e.target.classList.add("div_treeview_selected")
                callback(getFullPath(e.target));  
            }
            else if (e.target.classList.contains("div_treeview_marker")){
                if (e.target.innerText == "+"){
                    expand(e.target.parentNode);
                }
                else{
                    collapse(e.target.parentNode);
                }
            }
        });
    }

    function selectFirstItem(){
        removeAllSelected(divTVElement);
        var firstItem = divTVElement.children[0].children[0];
        firstItem.classList.add("div_treeview_selected")
        onSelect_Callback(firstItem.innerText.substr(1).trim())
    }

    function onDblClick(callback){
        divTVElement.ownerDocument.addEventListener("dblclick", (e)=>{
            if (e.target.classList.contains("div_treeview_item")){
                if (e.target.classList.contains("div_treeview_children_hidden")){
                    expand(e.target);
                }
                else{
                    collapse(e.target);
                }
                callback(getFullPath(e.target));
            }
        });
    }

    function getFullPath(divItem){
        var fullPath = [];
        var noParent = false;
        var divParent;
        while(!noParent){
            console.log("Found innertext = '" + divItem.innerText.substr(1).trim() + "'");
            fullPath.unshift(divItem.innerText.substr(1).trim()); //Inner text will have the marker on it.
            try{
                divItem = divItem.parentNode.parentNode.children[0];
                if (divItem.parentNode === divTVElement){
                    noParent = true;
                }
            }
            catch{
                noParent = true;
            }
        }
        return fullPath.join(divTVDelimeter);
    }

    function collapse(divItem){
        divItem.classList.add("div_treeview_children_hidden");
        var marker = divItem.children[0];
        marker.innerText = "+";
        var divParent = divItem.parentNode;
        var children = divParent.children;
        var noChildren = true;
        for (var i=0; i<children.length; i++){
            if (!children[i].classList.contains("div_treeview_children_hidden")){
                children[i].classList.add("div_treeview_collapsed");
                noChildren = false;
            }
        }
        noChildren ? marker.innerText = "-" : null;
    }

    function collapseAll(divParent){
        // Set the parent to the root element if none was set.
        if (!divParent){
            divParent = divTVElement;
        }
        // Set all markers to "-""
        if (divParent.classList.contains("div_treeview_marker")){
            collapse(divParent.parentNode);
        }
        // Recurse through the children.
        var children = divParent.children;
        for (var i=0;i<children.length;i++){
            collapseAll(children[i]);
        }
    }

    function expandAll(divParent){
        // Set the parent to the root element if none was set.
        if (!divParent){
            divParent = divTVElement;
        }
        // Set all markers to "-""
        if (divParent.classList.contains("div_treeview_marker")){
            divParent.innerText = "-";
        }
        // Remove all the hidden and collapse classes.
        divParent.classList.remove("div_treeview_children_hidden");
        divParent.classList.remove("div_treeview_collapsed");
        // Recurse through the children.
        var children = divParent.children;
        for (var i=0;i<children.length;i++){
            expandAll(children[i]);
        }
    }

    function expand(divItem){
        divItem.classList.remove("div_treeview_children_hidden");
        var marker = divItem.children[0];
        marker.innerText = "-";
        var divParent = divItem.parentNode;
        var children = divParent.children;
        for (var i=0; i<children.length; i++){
            children[i].classList.remove("div_treeview_collapsed");
        }
    }

    function removeAllSelected(divParent){
        if (divParent){
            // It is necessary to copy the children into an array variable.
            // reference: https://stackoverflow.com/questions/17094230/how-do-i-loop-through-children-objects-in-javascript
            var children = divParent.children;
            divParent.classList.remove("div_treeview_selected");
            for (var i=0; i<children.length; i++){
                removeAllSelected(children[i]);
            }
        }
    }

    // Expose all public functions/objects here.
    this.loadItems = loadItems;
    this.addTVItem = addTVItem;
    this.onSelect = onSelect;
    this.onDblClick = onDblClick;
    this.expandAll = expandAll;
    this.collapseAll = collapseAll;
    this.selectFirstItem = selectFirstItem;
    
    return this.div_treeview;
}
