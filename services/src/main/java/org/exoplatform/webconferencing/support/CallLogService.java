/*
 * Copyright (C) 2003-2017 eXo Platform SAS.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */
package org.exoplatform.webconferencing.support;

/**
 * Created by The eXo Platform SAS.
 *
 * @author <a href="mailto:pnedonosko@exoplatform.com">Peter Nedonosko</a>
 * @version $Id: CallLogService.java 00000 Dec 20, 2017 pnedonosko $
 */
public class CallLogService {

  /**
   * The Class ManagedCallLog.
   */
  class ManagedCallLog extends CallLog {

    /** The consumer id. */
    private final String consumerId;

    /**
     * Instantiates a new managed call log.
     *
     * @param consumerId the consumer id
     */
    ManagedCallLog(String consumerId) {
      this.consumerId = consumerId;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void info(String msg) {
      // TODO Auto-generated method stub
      super.info(msg);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void warn(String msg) {
      // TODO Auto-generated method stub
      super.warn(msg);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void error(String msg) {
      // TODO Auto-generated method stub
      super.error(msg);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void trace(String msg) {
      // TODO Auto-generated method stub
      super.trace(msg);
    }

  }

  /** The log. */
  private final CallLog log = new CallLog();

  /**
   * Instantiates a new call log service.
   */
  public CallLogService() {
    // TODO any?
  }

  /**
   * Gets the log.
   *
   * @return the log
   */
  public CallLog getLog() {
    // TODO use managed log
    return log;
  }

}