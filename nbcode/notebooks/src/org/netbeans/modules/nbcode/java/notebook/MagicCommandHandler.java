/*
/*
 * Copyright (c) 2025, Oracle and/or its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.netbeans.modules.nbcode.java.notebook;

import java.io.File;
import java.util.List;
import java.util.function.Consumer;
import java.util.logging.Logger;
import org.netbeans.modules.java.lsp.server.notebook.NotebookDependencyHandler;

/**
 *
 * @author atalati
 */
public class MagicCommandHandler {

    private static final Logger LOG = Logger.getLogger(MagicCommandHandler.class.getName());

    public static List<File> handler(String coords, Consumer<String> progressCallback) throws Exception {
        NotebookDependencyHandler handler = NotebookDependencyHandler.getInstance();
        List<File> files;
        if (progressCallback == null) {
            files = handler.resolveTransitiveDependencies(coords);
        } else {
            files = handler.resolveTransitiveDependencies(coords, progressCallback);
        }
        
        if (progressCallback == null) {
            for (File f : files) {
                LOG.info(() -> "Jar added to classpath: " + f.getName());
            }
        }

        return files;
    }

    public static List<File> handler(String coords) throws Exception {
        return handler(coords, null);
    }

}
