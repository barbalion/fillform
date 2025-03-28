(function () {
    const dataStorage = "hgFillFormData";
    const createEl = (tag, props = {}, style = "") => {
        const el = document.createElement(tag);
        Object.assign(el, props);
        if (style) el.style.cssText = style;
        return el;
    };

    function showNotification(message, type = "success") {
        const colors = {success: "#4CAF50", error: "#F44336", warning: "#FF9800", info: "#2196F3"};
        const existing = document.getElementById("form-overlay-notification");
        if (existing) existing.remove();
        const notif = createEl("div", {id: "form-overlay-notification", textContent: message},
            `position:fixed;bottom:10px;left:50%;transform:translateX(-50%);background-color:${colors[type]};color:white;
      padding:5px 10px;border-radius:2px;z-index:10001;box-shadow:0 2px 2px rgba(0,0,0,0.2);
      font-size:12px;transition:opacity 0.3s ease-in-out`
        );
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.style.opacity = "0";
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    const createOverlay = () => {
        const overlay = createEl("div", {id: "field-overlay"}, "position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,0.7);z-index:10000;display:flex;flex-direction:column;align-items:center;overflow:hidden");
        const headerPanel = createEl("div", {}, "background-color:#f8f9fa;width:90%;max-width:800px;padding:5px 10px;border-radius:2px 2px 0 0;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;box-shadow:0 1px 3px rgba(0,0,0,0.1)");
        const headerTitle = createEl("div", {}, "display:flex;align-items:center");
        const title = createEl("h2", {textContent: "Fill Form: press <Enter> to fill and save or use the buttons ==>"}, "margin:0;font-size:12px;color:#333");
        const fieldsCount = createEl("span", {id: "fields-count"}, "background:#eee;color:#555;font-size:12px;padding:2px 2px;border-radius:5px;margin-left:5px");
        headerTitle.append(title, fieldsCount);
        const btnStyle = "color:white;border:none;padding:6px 12px;border-radius:2px;cursor:pointer;font-size:14px;width:auto;height:auto;";
        const buttonContainer = createEl("div", {}, "display:flex;gap:5px");
        const loadPageButton = createEl("button", {
            id: "load-page-button",
            textContent: "Load from Page"
        }, "background-color:#4CAF50;" + btnStyle);
        const fillPageButton = createEl("button", {
            id: "fill-page-button",
            textContent: "Fill the Page"
        }, "background-color:#2196F3;" + btnStyle);
        const saveButton = createEl("button", {
            id: "save-button",
            textContent: "Save"
        }, "background-color:#FF9800;" + btnStyle);
        const loadButton = createEl("button", {
            id: "load-button",
            textContent: "Load"
        }, "background-color:#9C27B0;" + btnStyle);
        const closeButton = createEl("button", {textContent: "×"}, "background:none;border:none;font-size:22px;cursor:pointer;color:#333;margin-left:5px");
        closeButton.onclick = () => document.body.removeChild(overlay);
        buttonContainer.append(loadPageButton, fillPageButton, saveButton, loadButton, closeButton);
        headerPanel.append(headerTitle, buttonContainer);
        const formContainer = createEl("div", {}, "background:white;padding:10px;border-radius:0 0 2px 2px;max-width:800px;width:90%;max-height:calc(90vh - 60px);overflow-y:auto;position:relative");
        const form = createEl("form", {id: "overlay-form"});
        formContainer.append(form);
        overlay.append(headerPanel, formContainer);
        return {overlay, form, loadPageButton, fillPageButton, saveButton, loadButton, fieldsCount};
    };

    const findEditableFields = () => {
        const fields = [];
        document.querySelectorAll("input").forEach(inp => {
            if (!["hidden", "submit", "button", "reset", "image", "file"].includes(inp.type))
                fields.push(inp)
        });
        document.querySelectorAll("textarea, select").forEach(el => fields.push(el));
        return fields;
    };

    const getFieldName = field => {
        const MAX = 100;
        const clean = text => text ? text.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").replace(/[:*]\s*$/, "").replace(/^[:\s*]+/, "").trim() : "";
        const valid = text => {
            const t = clean(text);
            return t.length > 0 && t.length < MAX && !/^(https?:|www\.|\/|\d+px|\d+%|null|undefined|NaN)/.test(t);
        };
        if (field.id) {
            const lbl = document.querySelector(`label[for="${field.id}"]`);
            if (lbl && valid(lbl.textContent)) return clean(lbl.textContent);
        }
        const parentLabel = field.closest("label");
        if (parentLabel) {
            const clone = parentLabel.cloneNode(true);
            clone.querySelectorAll("input, select, textarea, button").forEach(e => e.remove());
            if (valid(clone.textContent)) return clean(clone.textContent);
        }
        const row = field.closest(".row, [class*='row-']");
        if (row) {
            const cand = Array.from(row.querySelectorAll("div, span, label, p"))
                .filter(el => !el.contains(field) && valid(el.textContent));
            if (cand.length) return clean(cand[0].textContent);
        }
        const fs = field.closest("fieldset");
        if (fs) {
            const legend = fs.querySelector("legend");
            if (legend && field.parentNode === fs && valid(legend.textContent))
                return clean(legend.textContent);
        }
        const prev = field.previousElementSibling;
        if (prev && ["SPAN", "DIV", "LABEL", "P", "H1", "H2", "H3", "H4", "H5", "H6", "STRONG", "B"].includes(prev.tagName) && valid(prev.textContent))
            return clean(prev.textContent);
        if (field.placeholder && valid(field.placeholder))
            return clean(field.placeholder);
        if (field.name)
            return field.name.replace(/[_-]/g, " ").replace(/([A-Z])/g, " $1").replace(/^\w/, c => c.toUpperCase()).trim();
        if (field.id)
            return field.id.replace(/[_-]/g, " ").replace(/([A-Z])/g, " $1").replace(/^\w/, c => c.toUpperCase()).trim();
        return `${field.tagName.toLowerCase()} ${field.type || ""}`.trim();
    };

    const getUniqueSelector = el => {
        if (el.id) return `#${el.id}`;
        if (el.name) {
            const same = document.querySelectorAll(`[name="${el.name}"]`);
            if (same.length === 1) return `[name="${el.name}"]`;
        }
        const parts = [];
        while (el && el !== document.body) {
            let sel = el.tagName.toLowerCase();
            if (el.id) {
                sel = `#${el.id}`;
                parts.unshift(sel);
                break;
            }
            if (el.className && typeof el.className === "string") {
                const classes = el.className.split(/\s+/).filter(c => c && !c.startsWith("js-") && !c.includes(":"));
                if (classes.length) sel += `.${classes.slice(0, 2).join(".")}`;
            }
            const siblings = Array.from(el.parentNode.children).filter(child => child.tagName === el.tagName);
            if (siblings.length > 1) {
                const index = siblings.indexOf(el);
                sel += `:nth-of-type(${index + 1})`;
            }
            parts.unshift(sel);
            el = el.parentNode;
        }
        return parts.join(" > ");
    };

    const cloneField = orig => {
        const fieldName = getFieldName(orig);
        const container = createEl("div", {}, "margin-bottom:5px;border-left:3px solid #eee;padding-left:5px");
        const header = createEl("div", {}, "display:flex;align-items:center;flex-wrap:wrap;margin-bottom:3px;gap:2px");
        const label = createEl("label", {textContent: fieldName}, "font-weight:bold;color:#333;margin-right:2px;font-size:13px");
        const meta = createEl("div", {}, "display:flex;gap:2px;font-size:10px;color:#777;flex-wrap:wrap;align-items:center;flex-grow:1");
        if (orig.id) {
            const idPill = createEl("span", {textContent: `#${orig.id}`}, "background:#f0f0f0;padding:1px 2px;border-radius:2px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;max-width:150px");
            meta.appendChild(idPill);
        }
        if (orig.name) {
            const namePill = createEl("span", {textContent: orig.name}, "background:#e5e5ff;padding:1px 2px;border-radius:2px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;max-width:150px");
            meta.appendChild(namePill);
        }
        const typePill = createEl("span", {textContent: orig.type || orig.tagName.toLowerCase()}, "background:#e5ffe5;padding:1px 2px;border-radius:2px");
        meta.appendChild(typePill);
        const selectorParts = [];
        let cur = orig, depth = 0;
        while (cur && depth < 3) {
            if (cur.id) {
                selectorParts.unshift(`#${cur.id}`);
                break;
            } else if (cur.className && typeof cur.className === "string") {
                const classes = cur.className.split(/\s+/).filter(c => c && c.length < 20 && !c.includes(":") && !/^\d/.test(c));
                if (classes.length) {
                    selectorParts.unshift(`.${classes.join(".")}`);
                    break;
                }
            }
            selectorParts.unshift(cur.tagName.toLowerCase());
            cur = cur.parentElement;
            depth++;
        }
        const locPill = createEl("span", {textContent: selectorParts.join(" > ")}, "background:#fff0e5;padding:1px 2px;border-radius:2px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;max-width:150px");
        locPill.title = "Location in DOM";
        meta.appendChild(locPill);

        const findBtn = createEl("button", {
            textContent: "Find in page",
            type: "button"
        }, "background:none;border:none;color:#0066cc;font-size:10px;cursor:pointer;text-decoration:underline;padding:0;margin-left:auto;width:auto;height:auto;");
        findBtn.onclick = () => {
            let el = orig;
            let isVisible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
            while (!isVisible && el.parentElement) {
                el = el.parentElement;
                isVisible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
            }
            el.style.outline = "3px solid #ff6b6b";
            el.style.boxShadow = "0 0 5px rgba(255,107,107,0.5)";
            setTimeout(() => {
                el.style.outline = "";
                el.style.boxShadow = "";
            }, 1000);
            el.scrollIntoView({behavior: "smooth", block: "center"});
            const overlay = document.getElementById("field-overlay");
            if (overlay) {
                overlay.style.display = "none";
                setTimeout(() => {
                    overlay.style.display = "flex";
                }, 1000);
            }
        };
        meta.appendChild(findBtn);
        header.append(label, meta);
        container.appendChild(header);
        let newField;
        if (orig.tagName === "SELECT") {
            newField = createEl("select");
            Array.from(orig.options).forEach(opt => {
                const newOpt = createEl("option", {value: opt.value, textContent: opt.textContent});
                newOpt.selected = opt.selected;
                newField.appendChild(newOpt);
            });
            if (orig.multiple) newField.multiple = true;
        } else if (orig.tagName === "TEXTAREA") {
            newField = createEl("textarea", {value: orig.value, placeholder: orig.placeholder});
            newField.rows = orig.rows || 3;
            newField.cols = orig.cols;
        } else {
            newField = createEl("input", {type: orig.type || "text", value: orig.value, placeholder: orig.placeholder});
            ['min', 'max', 'step', 'checked'].forEach(prop => orig[prop] && (newField[prop] = orig[prop]));
        }
        newField.name = orig.name;
        newField.id = `overlay-${orig.id || orig.name || Date.now()}`;
        newField.disabled = orig.disabled;
        newField.required = orig.required;
        newField.style.cssText = "width:100%;padding:6px;border:1px solid #ddd;border-radius:2px;box-sizing:border-box;font-size:13px";
        newField.dataset.originalFieldSelector = getUniqueSelector(orig);
        label.htmlFor = newField.id;
        container.appendChild(newField);
        return container;
    };

    function loadValuesFromPage(form, overwrite) {
        form.querySelectorAll("input, select, textarea").forEach(field => {
                const orig = document.querySelector(field.dataset.originalFieldSelector);
                if (!orig) return;
                if (orig.type === "checkbox" || orig.type === "radio")
                    field.checked = orig.checked;
                else if (overwrite || !field.value) {
                    (field.value = orig.value);
                }
            }
        );
    }

    function fillPageFromOverlay(form) {
        form.querySelectorAll("input, select, textarea").forEach(field => {
            const orig = document.querySelector(field.dataset.originalFieldSelector);
            if (!orig) return;
            if (field.type === "checkbox" || field.type === "radio")
                orig.checked = field.checked;
            else
                orig.value = field.value;
            orig.dispatchEvent(new Event("input", {bubbles: true}));
        });
    }

    function saveToLocalStorage(form) {
        const saved = localStorage.getItem(dataStorage);
        const data = saved ? {...JSON.parse(saved)} : {};
        form.querySelectorAll("input, select, textarea").forEach(field => {
            const key = field.dataset.originalFieldSelector;
            if (key) {
                data[key] = (field.type === "checkbox" || field.type === "radio") ? field.checked : field.value;
                console.log(`Saving field ${key}: ${data[key]}`);
            }
        });
        localStorage.setItem(dataStorage, JSON.stringify(data));
        showNotification("Form data saved.", "success");
    }

    function loadFromLocalStorage(form, overwrite) {
        const saved = localStorage.getItem(dataStorage);
        if (!saved) {
            showNotification("No saved data found.", "warning");
            return;
        }
        const data = JSON.parse(saved);
        let count = 0;
        form.querySelectorAll("input, select, textarea").forEach(field => {
            const key = field.dataset.originalFieldSelector;
            if (key && data.hasOwnProperty(key)) {
                count++;
                if (field.type === "checkbox" || field.type === "radio")
                    field.checked = data[key];
                else
                    field.value = data[key];
                if (field.type === "checkbox" || field.type === "radio") {
                    field.checked = data[key];
                } else {
                    if (overwrite || !field.value) {
                        field.value = data[key];
                    }

                    if (field.tagName === 'SELECT') {
                        Array.from(field.options).forEach(option => {
                            option.selected = option.value === data[key];
                        });
                    }
                }
                ['input', 'change'].forEach(event => field.dispatchEvent(new Event(event, {bubbles: true})));
            } else {
                console.warn(`Field ${key} not found in local storage data.`);
            }
        });
        if (count === 0) {
            showNotification("No saved data found.", "warning");
        } else {
            showNotification(`Form data loaded (${count} fields).`, "success");
        }
    }


    const createFieldOverlay = () => {
        const existing = document.getElementById("field-overlay");
        if (existing) document.body.removeChild(existing);
        const {overlay, form, loadPageButton, fillPageButton, saveButton, loadButton, fieldsCount} = createOverlay();
        const fields = findEditableFields();
        fieldsCount.textContent = fields.length + " fields";
        let currentGroup = "";
        fields.forEach(field => {
            let groupName = "";
            const fs = field.closest("fieldset");
            const frm = field.closest("form");
            if (fs && fs.querySelector("legend"))
                groupName = fs.querySelector("legend").textContent.trim();
            else if (frm && (frm.id || frm.name))
                groupName = (frm.id || frm.name).replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/^\w/, c => c.toUpperCase()).trim();
            if (groupName && groupName !== currentGroup) {
                currentGroup = groupName;
                if (form.children.length) {
                    const hr = createEl("hr", {}, "margin:10px 0;border:0;border-top:1px solid #ddd");
                    form.appendChild(hr);
                }
                const h3 = createEl("h3", {textContent: currentGroup}, "margin:15px 0;font-size:16px;color:#555");
                form.appendChild(h3);
            }
            const cloned = cloneField(field);
            form.appendChild(cloned);
        });
        if (fields.length) {
            loadPageButton.addEventListener("click", () => loadValuesFromPage(form, true));
            loadButton.addEventListener("click", () => loadFromLocalStorage(form, true));
            fillPageButton.addEventListener("click", () => fillPageFromOverlay(form));
            saveButton.addEventListener("click", () => saveToLocalStorage(form));
        } else {
            const msg = createEl("p", {textContent: "No editable fields were found on this page."}, "color:#666;font-style:italic;text-align:center;margin:10px 0;");
            form.appendChild(msg);
            loadPageButton.disabled = fillPageButton.disabled = saveButton.disabled = loadButton.disabled = true;
        }
        document.body.appendChild(overlay);
        const listener = e => {
            if (e.key === "Escape" && document.getElementById("field-overlay")) {
                document.body.removeChild(overlay);
                document.removeEventListener("keydown", listener);
            }
            if (e.key === "Enter" && document.getElementById("field-overlay")) {
                saveToLocalStorage(form);
                fillPageFromOverlay(form);
                document.body.removeChild(overlay);
                document.removeEventListener("keydown", listener);
            }
        };
        document.addEventListener("keydown", listener);
        overlay.addEventListener("click", e => {
            if (e.target === overlay)
                document.body.removeChild(overlay)
        });

        loadFromLocalStorage(form, false);
        loadValuesFromPage(form, false);
    };
    createFieldOverlay();
})
();
